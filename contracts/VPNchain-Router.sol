// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

contract TempWallet {
    address public router;
    IERC20 public token;

    modifier onlyRouter() {
        require(msg.sender == router, "Not router");
        _;
    }

    constructor(address _router, address _token) {
        require(_router != address(0), "router zero");
        require(_token != address(0), "token zero");
        router = _router;
        token = IERC20(_token);
    }

    function forward(address to, uint256 amount) external onlyRouter {
        require(to != address(0), "to zero");
        require(amount > 0, "amount zero");
        require(token.transfer(to, amount), "Forward failed");
    }
}

contract VPNChain {
    address public owner;

    struct RouteMeta {
        uint256 amount;
        address sender;
        address receiver;
        address token;
        uint256 createdAt;
        uint256 nextStepTime;
        uint256 totalSteps;
        uint256 completedSteps;
        bool completed;
        uint256 avgDelay;
        bool isSecure;
        uint256 completedAt;
    }

    mapping(uint256 => RouteMeta) public routes;
    mapping(uint256 => address[]) public routeSequence;
    mapping(address => mapping(address => uint256)) public internalBalance;
    uint256 public nextId;

    uint256 private _locked = 1;
    modifier nonReentrant() {
        require(_locked == 1, "Reentrant");
        _locked = 2;
        _;
        _locked = 1;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    event Deposit(address indexed user, address indexed token, uint256 amount, uint8 tokenDecimals);
    event OwnerWithdraw(address indexed to, address indexed token, uint256 amount);
    event RouteCreated(uint256 indexed id, address indexed sender, address indexed receiver, address token, uint256 amount, uint256 steps, bool isSecure, uint8 tokenDecimals);
    event StepExecuted(uint256 indexed id, uint256 indexed stepIndex, address from, address to, uint256 timestamp);
    event RouteCompleted(uint256 indexed id, address indexed receiver, uint256 amount, uint256 timestamp);
    event SequenceStored(uint256 indexed id, address[] sequence);

    constructor() {
        owner = msg.sender;
        nextId = 1;
    }

    function deposit(address token, uint256 amount, uint8 tokenDecimals) external nonReentrant {
        require(token != address(0), "token zero");
        require(amount > 0, "amount zero");
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "transferFrom failed");
        internalBalance[token][msg.sender] += amount;
        emit Deposit(msg.sender, token, amount, tokenDecimals);
    }

    function ownerWithdraw(address token, uint256 amount, address to) external onlyOwner nonReentrant {
        require(token != address(0), "token zero");
        require(to != address(0), "to zero");
        require(amount > 0, "amount zero");
        require(IERC20(token).transfer(to, amount), "transfer failed");
        emit OwnerWithdraw(to, token, amount);
    }

    function _createTempWallet(address tokenAddr) internal returns (address) {
        TempWallet tw = new TempWallet(address(this), tokenAddr);
        return address(tw);
    }

    function _randUint(uint256 salt, uint256 mod) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender, salt))) % mod;
    }

    function _buildAlternatingSequence(uint256 hopsCount, address finalReceiver, uint256 id, address tokenAddr) internal {
        require(hopsCount >= 2, "hopsCount too small");
        address[] memory seq = new address[](hopsCount);
        uint256 idx = 0;
        while (idx < hopsCount) {
            if (idx % 3 == 2) {
                seq[idx] = address(this);
            } else {
                seq[idx] = _createTempWallet(tokenAddr);
            }
            idx++;
        }
        seq[hopsCount - 1] = finalReceiver;

        delete routeSequence[id];
        for (uint256 i = 0; i < hopsCount; i++) {
            routeSequence[id].push(seq[i]);
        }
        emit SequenceStored(id, routeSequence[id]);
    }

    function sendInstant(address tokenAddr, address receiver, uint256 amount, uint8 tokenDecimals) external nonReentrant returns (uint256) {
        require(tokenAddr != address(0), "token zero");
        require(receiver != address(0), "receiver zero");
        require(amount > 0, "amount zero");

        if (msg.sender != owner) {
            require(internalBalance[tokenAddr][msg.sender] >= amount, "Insufficient internal balance");
            internalBalance[tokenAddr][msg.sender] -= amount;
        }

        uint256 hopsCount = 6 + _randUint(1, 5);
        uint256 id = nextId++;
        RouteMeta storage meta = routes[id];
        meta.amount = amount;
        meta.sender = msg.sender;
        meta.receiver = receiver;
        meta.token = tokenAddr;
        meta.createdAt = block.timestamp;
        meta.totalSteps = hopsCount;
        meta.completedSteps = 0;
        meta.completed = false;
        meta.isSecure = false;
        meta.avgDelay = 0;
        meta.nextStepTime = block.timestamp;

        _buildAlternatingSequence(hopsCount, receiver, id, tokenAddr);

        emit RouteCreated(id, msg.sender, receiver, tokenAddr, amount, hopsCount, false, tokenDecimals);

        address[] storage seqStorage = routeSequence[id];
        require(seqStorage.length == hopsCount, "sequence mismatch");
        address[] memory seq = new address[](hopsCount);
        for (uint256 i = 0; i < hopsCount; i++) seq[i] = seqStorage[i];

        require(IERC20(tokenAddr).transfer(seq[0], amount), "initial transfer failed");

        for (uint256 step = 0; step < hopsCount - 1; step++) {
            address from = seq[step];
            address to = seq[step + 1];

            if (from == address(this)) {
                require(IERC20(tokenAddr).transfer(to, amount), "transfer by router failed");
            } else {
                TempWallet(payable(from)).forward(to, amount);
            }

            meta.completedSteps += 1;
            emit StepExecuted(id, step, from, to, block.timestamp);
        }

        meta.completed = true;
        meta.completedAt = block.timestamp;
        emit RouteCompleted(id, receiver, amount, block.timestamp);

        return id;
    }

    function sendSecure(
        address tokenAddr,
        address receiver,
        uint256 amount,
        bool is48h,
        uint256 hopsCountUser,
        uint8 tokenDecimals
    ) external nonReentrant returns (uint256) {
        require(tokenAddr != address(0), "token zero");
        require(receiver != address(0), "receiver zero");
        require(amount > 0, "amount zero");

        if (msg.sender != owner) {
            require(internalBalance[tokenAddr][msg.sender] >= amount, "Insufficient internal balance");
            internalBalance[tokenAddr][msg.sender] -= amount;
        }

        uint256 hopsCount = hopsCountUser;
        if (hopsCount < 3 || hopsCount > 20) {
            hopsCount = 6 + _randUint(2, 7);
        }

        uint256 id = nextId++;

        RouteMeta storage meta = routes[id];
        meta.amount = amount;
        meta.sender = msg.sender;
        meta.receiver = receiver;
        meta.token = tokenAddr;
        meta.createdAt = block.timestamp;
        meta.totalSteps = hopsCount;
        meta.completedSteps = 0;
        meta.completed = false;
        meta.isSecure = true;

        uint256 totalDuration = is48h ? 48 hours : 24 hours;
        uint256 avg = totalDuration / hopsCount;
        meta.avgDelay = avg;
        meta.nextStepTime = block.timestamp + avg;

        _buildAlternatingSequence(hopsCount, receiver, id, tokenAddr);

        emit RouteCreated(id, msg.sender, receiver, tokenAddr, amount, hopsCount, true, tokenDecimals);

        address[] storage seqStorage = routeSequence[id];
        require(seqStorage.length == hopsCount, "sequence mismatch");
        require(IERC20(tokenAddr).transfer(seqStorage[0], amount), "fund first wallet failed");

        return id;
    }

    function processRoute(uint256 id) external nonReentrant {
        RouteMeta storage meta = routes[id];
        require(meta.totalSteps > 0, "route not found");
        require(!meta.completed, "already completed");
        require(block.timestamp >= meta.nextStepTime, "too early");

        address[] storage seq = routeSequence[id];
        require(seq.length == meta.totalSteps, "sequence mismatch");

        uint256 step = meta.completedSteps;
        require(step < meta.totalSteps - 1, "no more steps");

        address from = seq[step];
        address to = seq[step + 1];

        if (from == address(this)) {
            require(IERC20(meta.token).transfer(to, meta.amount), "router transfer failed");
        } else {
            TempWallet(payable(from)).forward(to, meta.amount);
        }

        meta.completedSteps += 1;
        emit StepExecuted(id, step, from, to, block.timestamp);

        if (meta.completedSteps >= meta.totalSteps - 1) {
            meta.completed = true;
            meta.completedAt = block.timestamp;
            emit RouteCompleted(id, meta.receiver, meta.amount, block.timestamp);
            return;
        }

        uint256 jitter = _randUint(step + 12345, meta.avgDelay + 1);
        uint256 nextDelay = meta.avgDelay + (jitter % (meta.avgDelay + 1));
        meta.nextStepTime = block.timestamp + nextDelay;
    }

    function getRouteSequence(uint256 id) external view returns (uint256 routeId, address[] memory sequence) {
        address[] storage seq = routeSequence[id];
        address[] memory out = new address[](seq.length);
        for (uint256 i = 0; i < seq.length; i++) out[i] = seq[i];
        return (id, out);
    }

    function getRouteMetaBasic(uint256 id) external view returns (
        uint256 routeId,
        uint256 amount,
        address sender,
        address receiver,
        address token,
        uint256 createdAt,
        uint256 nextStepTime
    ) {
        return (
            id,
            routes[id].amount,
            routes[id].sender,
            routes[id].receiver,
            routes[id].token,
            routes[id].createdAt,
            routes[id].nextStepTime
        );
    }

    function getRouteMetaProgress(uint256 id) external view returns (
        uint256 routeId,
        uint256 totalSteps,
        uint256 completedSteps,
        bool completed,
        uint256 avgDelay,
        bool isSecure,
        uint256 completedAt
    ) {
        return (
            id,
            routes[id].totalSteps,
            routes[id].completedSteps,
            routes[id].completed,
            routes[id].avgDelay,
            routes[id].isSecure,
            routes[id].completedAt
        );
    }

    function estimateRemainingTime(uint256 id) external view returns (uint256) {
        uint256 totalSteps = routes[id].totalSteps;
        if (totalSteps == 0) return type(uint256).max;
        if (routes[id].completed) return 0;

        uint256 completedSteps = routes[id].completedSteps;
        uint256 nextStepTime = routes[id].nextStepTime;
        uint256 avgDelay = routes[id].avgDelay;

        uint256 remainingSteps;
        if (completedSteps >= totalSteps) remainingSteps = 0;
        else remainingSteps = totalSteps - completedSteps - 1;

        uint256 waitForCurrent = 0;
        if (block.timestamp < nextStepTime) waitForCurrent = nextStepTime - block.timestamp;

        uint256 estimate = waitForCurrent + (remainingSteps * avgDelay);
        return estimate;
    }

    function purgeRoute(uint256 id) external nonReentrant {
        require(routes[id].totalSteps > 0, "route not found");
        require(block.timestamp >= routes[id].createdAt + 180 days, "not old enough");
        delete routes[id];
        delete routeSequence[id];
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "new owner zero");
        owner = newOwner;
    }

    function GetContractBalance(address tokenAddr, uint8 /* tokenDecimals */) external view returns (uint256) {
        return IERC20(tokenAddr).balanceOf(address(this));
    }

    function GetUserBalance(address tokenAddr, address user, uint8 /* tokenDecimals */) external view returns (uint256) {
        return internalBalance[tokenAddr][user];
    }
}
