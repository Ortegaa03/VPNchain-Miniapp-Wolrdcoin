"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type Language = "es" | "en"

interface Translations {
  [key: string]: {
    es: string
    en: string
  }
}

export const translations: Translations = {
  // Navigation
  "nav.vpnchain": { es: "VPNchain", en: "VPNchain" },
  "nav.profile": { es: "Perfil", en: "Profile" },
  "nav.help": { es: "Ayuda", en: "Help" },
  "nav.comingSoon": { es: "Próximamente", en: "Coming Soon" },
  "nav.admin": { es: "Swap", en: "Swap" },
  "nav.send": { es: "Enviar", en: "Send" },
  "nav.swap": { es: "Swap", en: "Swap" },
  "nav.dashboard": { es: "Inicio", en: "Home" },

  // Landing Page
  "landing.title": { es: "VPNchain", en: "VPNchain" },
  "landing.subtitle": { es: "Privacy Protocol", en: "Privacy Protocol" },
  "landing.description": {
    es: "Envía WLD tokens de forma privada y segura a través del protocolo VPNchain",
    en: "Send WLD tokens privately and securely through VPNchain protocol",
  },
  "landing.worldAppDetected": {
    es: "World App detectada. Al continuar, se te pedirá verificar con World ID.",
    en: "World App detected. By continuing, you will be asked to verify with World ID.",
  },
  "landing.privacyTitle": { es: "Privacidad Total", en: "Total Privacy" },
  "landing.privacyDescription": {
    es: "Tus transacciones son privadas y seguras",
    en: "Your transactions are private and secure",
  },
  "landing.fastTitle": { es: "Rápido y Fácil", en: "Fast and Easy" },
  "landing.fastDescription": {
    es: "Envía tokens en segundos con nuestro protocolo",
    en: "Send tokens in seconds with our protocol",
  },
  "landing.verifyWorldID": { es: "Verificar con World ID", en: "Verify with World ID" },
  "landing.start": { es: "Iniciar", en: "Start" },
  "landing.authenticating": { es: "Autenticando...", en: "Authenticating..." },
  "landing.starting": { es: "Iniciando...", en: "Starting..." },
  "landing.terms": {
    es: "Al continuar, aceptas nuestros términos y condiciones",
    en: "By continuing, you accept our terms and conditions",
  },
  "landing.authSuccess": { es: "Autenticación exitosa", en: "Authentication successful" },
  "landing.welcome": { es: "Bienvenido", en: "Welcome" },
  "landing.authError": { es: "Error de autenticación", en: "Authentication error" },
  "landing.verifyError": { es: "No se pudo verificar tu identidad.", en: "Could not verify your identity." },
  "landing.worldIDError": {
    es: "Hubo un problema con la autenticación de World ID.",
    en: "There was a problem with World ID authentication.",
  },
  "landing.errorRetry": {
    es: "Hubo un problema al iniciar. Intenta de nuevo.",
    en: "There was a problem starting. Try again.",
  },

  // How to Use
  "howto.title": { es: "Cómo usar VPNchain", en: "How to use VPNchain" },
  "howto.close": { es: "Entendido", en: "Got it" },

  // How to Use - Modes
  "howto.modes.title": { es: "Modos de transferencia", en: "Transfer modes" },
  "howto.modes.description": {
    es: "VPNchain ofrece dos modos de transferencia para adaptarse a tus necesidades de privacidad.",
    en: "VPNchain offers two transfer modes to suit your privacy needs.",
  },
  "howto.instant.title": { es: "Modo Instantáneo", en: "Instant Mode" },
  "howto.instant.description": {
    es: "Transferencia rápida con múltiples saltos automáticos para ofuscar el origen y destino en minutos.",
    en: "Fast transfer with automatic multiple hops to obfuscate origin and destination in minutes.",
  },
  "howto.secure.title": { es: "Modo Seguro", en: "Secure Mode" },
  "howto.secure.description": {
    es: "Máxima privacidad con saltos distribuidos en el tiempo. Puede tardar horas pero ofrece mayor anonimato.",
    en: "Maximum privacy with time-distributed hops. May take hours but offers greater anonymity.",
  },

  // How to Use - Steps
  "howto.step1.title": { es: "Ingresa el monto y wallets", en: "Enter amount and wallets" },
  "howto.step1.description": {
    es: "Especifica cuántos tokens deseas enviar, tu wallet de origen y la wallet destino final.",
    en: "Specify how many tokens you want to send, your source wallet and the final destination wallet.",
  },
  "howto.step2.title": { es: "Selecciona el modo de transferencia", en: "Select transfer mode" },
  "howto.step2.description": {
    es: "Elige entre modo Instantáneo (rápido) o Seguro (máxima privacidad con delays).",
    en: "Choose between Instant mode (fast) or Secure mode (maximum privacy with delays).",
  },
  "howto.step3.title": { es: "Revisa y confirma", en: "Review and confirm" },
  "howto.step3.description": {
    es: "Verifica todos los detalles de tu transacción antes de continuar.",
    en: "Verify all your transaction details before proceeding.",
  },
  "howto.step4.title": { es: "Realiza el pago", en: "Make payment" },
  "howto.step4.description": {
    es: "Envía el monto exacto desde tu wallet al contrato inteligente de VPNchain.",
    en: "Send the exact amount from your wallet to the VPNchain smart contract.",
  },
  "howto.step5.title": { es: "VPNchain procesa tu transacción", en: "VPNchain processes your transaction" },
  "howto.step5.description": {
    es: "El protocolo enruta automáticamente tu transacción a través de múltiples wallets intermedias.",
    en: "The protocol automatically routes your transaction through multiple intermediate wallets.",
  },
  "howto.step6.title": { es: "Recibe confirmación", en: "Receive confirmation" },
  "howto.step6.description": {
    es: "Una vez completados todos los saltos, los fondos llegarán a la wallet destino.",
    en: "Once all hops are completed, funds will arrive at the destination wallet.",
  },

  // How to Use - Privacy & Disclaimer
  "howto.privacy.title": { es: "Privacidad y Seguridad", en: "Privacy and Security" },
  "howto.privacy.description": {
    es: "VPNchain utiliza enrutamiento multi-hop para ofuscar el origen y destino de las transacciones. Cada salto agrega una capa adicional de privacidad, haciendo extremadamente difícil rastrear la ruta completa.",
    en: "VPNchain uses multi-hop routing to obfuscate the origin and destination of transactions. Each hop adds an additional layer of privacy, making it extremely difficult to trace the complete route.",
  },
  "howto.disclaimer.title": { es: "Aviso importante", en: "Important notice" },
  "howto.disclaimer.description": {
    es: "Si bien VPNchain mejora significativamente la privacidad de tus transacciones mediante enrutamiento multi-hop, no garantiza el 100% de anonimato. Usa este servicio de forma responsable y cumpliendo las leyes de tu jurisdicción.",
    en: "While VPNchain significantly improves the privacy of your transactions through multi-hop routing, it does not guarantee 100% anonymity. Use this service responsibly and in compliance with your jurisdiction's laws.",
  },

  profile: { es: "Perfil", en: "Profile" },

  // Header
  "header.howToUse": { es: "Cómo usar", en: "How to use" },

  // Send Form
  "send.title": { es: "Enviar Tokens", en: "Send Tokens" },
  "send.subtitle": {
    es: "Transfiere tokens con privacidad mediante protocolo VPNchain",
    en: "Transfer tokens privately via VPNchain protocol",
  },
  "send.youSend": { es: "Envías", en: "You send" },
  "send.balance": { es: "Balance", en: "Balance" },
  "send.fromWallet": { es: "Wallet remitente", en: "From wallet" },
  "send.toWallet": { es: "Destinatario", en: "Recipient" },
  "send.yourWalletAddress": { es: "Tu dirección de wallet", en: "Your wallet address" },
  "send.destinationAddress": { es: "Dirección de destino", en: "Destination address" },
  "send.commission": { es: "Comisión (2%)", en: "Commission (2%)" },
  "send.recipientWillReceive": { es: "Destinatario recibirá", en: "Recipient will receive" },
  "send.selectTransferMode": { es: "Selecciona el modo de transferencia", en: "Select transfer mode" },
  "send.instantMode": { es: "Instantáneo", en: "Instant" },
  "send.instantModeDesc": {
    es: "Transferencia rápida con múltiples saltos automáticos",
    en: "Fast transfer with automatic multiple hops",
  },
  "send.instantTime": { es: "Inmediato", en: "Immediate" },
  "send.secureMode": { es: "Seguro", en: "Secure" },
  "send.secureModeDesc": {
    es: "Máxima privacidad con saltos distribuidos en el tiempo",
    en: "Maximum privacy with time-distributed hops",
  },
  "send.disclaimer": {
    es: "VPNchain utiliza enrutamiento multi-hop para ofuscar el destino final de las transacciones. Si bien este método mejora significativamente la privacidad, no garantiza el 100% de anonimato.",
    en: "VPNchain uses multi-hop routing to obfuscate the final destination of transactions. While this method significantly improves privacy, it does not guarantee 100% anonymity.",
  },
  "send.confirmData": { es: "Confirmar datos", en: "Confirm data" },
  "send.error": { es: "Error de validación", en: "Validation error" },
  "send.enterValidSenderAddress": {
    es: "Ingresa una dirección de remitente válida",
    en: "Enter a valid sender address",
  },
  "send.enterValidRecipientAddress": {
    es: "Ingresa una dirección de destinatario válida",
    en: "Enter a valid recipient address",
  },
  "send.instant": { es: "Instantáneo", en: "Instant" },
  "send.secure": { es: "Seguro", en: "Secure" },
  "send.instantDescription": {
    es: "Transferencia rápida con múltiples saltos automáticos",
    en: "Fast transfer with automatic multiple hops",
  },
  "send.secureDescription": {
    es: "Máxima privacidad con saltos distribuidos en el tiempo",
    en: "Maximum privacy with time-distributed hops",
  },
  "send.senderWallet": { es: "Wallet remitente", en: "Sender wallet" },
  "send.recipientWallet": { es: "Wallet destinatario", en: "Recipient wallet" },
  "send.selectToken": { es: "Seleccionar token", en: "Select token" },

  // Swap translations
  "swap.title": { es: "Swap de Tokens", en: "Token Swap" },
  "swap.subtitle": { es: "Intercambia tokens directamente desde la DEX", en: "Exchange tokens directly from DEX" },
  "swap.youReceive": { es: "Recibes", en: "You receive" },
  "swap.youBuy": { es: "Recibes", en: "You receive" },
  "swap.destinationWallet": { es: "Wallet destinataria", en: "Destination wallet" },
  "swap.confirm": { es: "Confirmar compra", en: "Confirm purchase" },
  "swap.comingSoon": { es: "Funcionalidad de compra en desarrollo", en: "Purchase functionality in development" },
  "swap.finalAmount": { es: "Cantidad final", en: "Final amount" },
  "swap.payWithWLD": {
    es: "Paga con WLD y recibe tokens directamente en tu wallet",
    en: "Pay with WLD and receive tokens directly in your wallet",
  },
  "swap.verifyingRoutes": { es: "Verificando rutas DEX...", en: "Verifying DEX routes..." },
  "swap.swapInProgress": { es: "Swap en progreso", en: "Swap in progress" },
  "swap.swapCompleted": { es: "Swap completado", en: "Swap completed" },
  "swap.swapFailed": { es: "Swap fallido", en: "Swap failed" },
  "swap.buyingToken": { es: "Comprando token", en: "Buying token" },
  "swap.sendFromWallet": { es: "Envía desde tu wallet", en: "Send from your wallet" },
  "swap.estimatedAmount": { es: "Cantidad estimada", en: "Estimated amount" },
  "swap.selectTokenToBuy": { es: "Seleccionar token a comprar", en: "Select token to buy" },

  // Confirmation
  "confirm.title": { es: "Confirmar datos", en: "Confirm data" },
  "confirm.transferMode": { es: "Modo de transferencia", en: "Transfer mode" },
  "confirm.amountToSend": { es: "Cantidad a enviar", en: "Amount to send" },
  "confirm.recipientWillReceive": { es: "Destinatario recibirá", en: "Recipient will receive" },
  "confirm.senderWallet": { es: "Wallet remitente", en: "Sender wallet" },
  "confirm.finalDestination": { es: "Wallet destinatario final", en: "Final destination wallet" },
  "confirm.privacyNotice": {
    es: "Tu transacción será enrutada a través del protocolo de privacidad VPNchain",
    en: "Your transaction will be routed through VPNchain privacy protocol",
  },
  "confirm.edit": { es: "Editar", en: "Edit" },
  "confirm.confirmSend": { es: "Confirmar envío", en: "Confirm send" },
  "confirm.confirmSwap": { es: "Confirmar swap", en: "Confirm swap" },

  // Invoice
  "invoice.title": { es: "Factura de pago - VPNchain", en: "Payment Invoice - VPNchain" },
  "invoice.amount": { es: "Envías", en: "You send" },
  "invoice.sender": { es: "Remitente", en: "Sender" },
  "invoice.finalRecipient": { es: "Destinatario final", en: "Final recipient" },
  "invoice.instructions": { es: "Instrucciones de pago:", en: "Payment instructions:" },
  "invoice.step1": { es: "Envía", en: "Send" },
  "invoice.fromYourWallet": { es: "desde tu wallet:", en: "from your wallet:" },
  "invoice.step2": { es: "Al contrato VPNchain:", en: "To VPNchain contract:" },
  "invoice.waiting": { es: "Esperando la transferencia...", en: "Waiting for transfer..." },
  "invoice.timeRemaining": { es: "Tiempo restante", en: "Time remaining" },
  "invoice.copy": { es: "Copiar", en: "Copy" },
  "invoice.copied": { es: "Copiado", en: "Copied" },
  "invoice.senderAddressCopied": { es: "Dirección del remitente copiada", en: "Sender address copied" },
  "invoice.recipientAddressCopied": { es: "Dirección del destinatario copiada", en: "Recipient address copied" },
  "invoice.contractAddressCopied": { es: "Dirección del contrato copiada", en: "Contract address copied" },
  "invoice.viewContract": { es: "Ver contrato en explorador", en: "View contract on explorer" },
  "invoice.transferCompleted": { es: "Transferencia completada", en: "Transfer completed" },
  "invoice.transactionSuccessful": { es: "Transacción exitosa", en: "Transaction successful" },
  "invoice.processingRefund": { es: "Procesando reembolso", en: "Processing refund" },
  "invoice.incorrectAmount": { es: "Cantidad incorrecta detectada", en: "Incorrect amount detected" },
  "invoice.amountReceived": { es: "Cantidad recibida", en: "Amount received" },
  "invoice.refundProcessed": { es: "Reembolso procesado", en: "Refund processed" },
  "invoice.fundsSentToSupport": { es: "Fondos enviados a soporte", en: "Funds sent to support" },
  "invoice.refundError": { es: "Error en reembolso. Contacta:", en: "Refund error. Contact:" },
  "invoice.processingError": { es: "Error al procesar. Contacta:", en: "Processing error. Contact:" },
  "invoice.executionError": { es: "Error al ejecutar. Contacta:", en: "Execution error. Contact:" },
  "invoice.monitoringError": { es: "Error al monitorear transacción", en: "Transaction monitoring error" },
  "invoice.paymentDetected": { es: "Pago detectado! Verificando...", en: "Payment detected! Verifying..." },
  "invoice.paymentDetectedTitle": { es: "Pago detectado!", en: "Payment detected!" },
  "invoice.from": { es: "Desde", en: "From" },
  "invoice.processingWithVPN": {
    es: "Procesando con protocolo de privacidad VPNchain...",
    en: "Processing with VPNchain privacy protocol...",
  },
  "invoice.startingVPN": { es: "Iniciando VPNchain...", en: "Starting VPNchain..." },
  "invoice.routingTransaction": { es: "Enrutando transacción...", en: "Routing transaction..." },
  "invoice.completed": { es: "¡Completado! 🎉", en: "Completed! 🎉" },
  "invoice.completedTitle": { es: "¡Transacción completada con éxito!", en: "Transaction completed successfully!" },
  "invoice.invoiceDetails": { es: "Detalles de la factura", en: "Invoice details" },
  "invoice.amountSent": { es: "Cantidad enviada", en: "Amount sent" },
  "invoice.fundsDelivered": {
    es: "Los fondos han sido entregados con privacidad VPNchain.",
    en: "Funds have been delivered with VPNchain privacy.",
  },
  "invoice.privacyMessage": {
    es: "Tu transacción será enrutada a través del protocolo de privacidad VPNchain",
    en: "Your transaction will be routed through VPNchain privacy protocol",
  },
  "invoice.privacyDescription": {
    es: "VPNchain utiliza enrutamiento multi-hop para ofuscar el destino final. Si bien mejora significativamente la privacidad, no garantiza el 100% de anonimato.",
    en: "VPNchain uses multi-hop routing to obfuscate the final destination. While it significantly improves privacy, it does not guarantee 100% anonymity.",
  },
  "invoice.swapCompleted": { es: "Swap completado", en: "Swap completed" },
  "invoice.secureInProgress": { es: "Transferencia segura en progreso", en: "Secure transfer in progress" },
  "invoice.secureInProgressDescription": {
    es: "Tu transferencia está siendo procesada a través de múltiples saltos distribuidos en el tiempo. Puedes ver el progreso detallado en tu perfil.",
    en: "Your transfer is being processed through multiple time-distributed hops. You can see detailed progress in your profile.",
  },
  "invoice.secureProgressDescription": {
    es: "Los fondos serán transferidos gradualmente durante las próximas 24-48 horas para máxima privacidad.",
    en: "Funds will be transferred gradually over the next 24-48 hours for maximum privacy.",
  },
  "invoice.secureTransferStarted": { es: "Transferencia segura iniciada", en: "Secure transfer started" },
  "invoice.secureTransferDescription": {
    es: "Tu transferencia está en progreso. Consulta el estado en tu perfil.",
    en: "Your transfer is in progress. Check status in your profile.",
  },
  "invoice.secureTransferStartedTitle": { es: "Transferencia segura iniciada", en: "Secure transfer started" },

  // Transaction Tracker
  "tracker.step1": { es: "Detectando pago", en: "Detecting payment" },
  "tracker.step2": { es: "Verificando fondos", en: "Verifying funds" },
  "tracker.step3": { es: "Enrutando por VPN", en: "Routing via VPN" },
  "tracker.step4": { es: "Procesando envío", en: "Processing transfer" },
  "tracker.step5": { es: "Completado", en: "Completed" },
  "tracker.paymentDetected": {
    es: "Pago detectado! Procesando con protocolo de privacidad...",
    en: "Payment detected! Processing with privacy protocol...",
  },
  "tracker.verifyingFunds": { es: "Verificando fondos en el contrato...", en: "Verifying funds in contract..." },
  "tracker.routing": {
    es: "Enrutando transacción a través de VPNchain...",
    en: "Routing transaction through VPNchain...",
  },
  "tracker.executing": { es: "Ejecutando transferencia privada...", en: "Executing private transfer..." },
  "tracker.completed": { es: "Transacción completada exitosamente!", en: "Transaction completed successfully!" },

  // Errors
  "error.title": { es: "Ha ocurrido un error", en: "An error occurred" },
  "error.message": {
    es: "Por favor, contacta con soporte para resolver el problema.",
    en: "Please contact support to resolve the issue.",
  },
  "error.contactSupport": { es: "Contactar soporte", en: "Contact support" },
  "error.transactionFailed": {
    es: "Transacción fallida. Contacta soporte:",
    en: "Transaction failed. Contact support:",
  },

  // Profile
  "profile.title": { es: "Perfil de usuario", en: "User profile" },
  "profile.userId": { es: "ID de usuario", en: "User ID" },
  "profile.username": { es: "Nombre de usuario", en: "Username" },
  "profile.name": { es: "Nombre", en: "Name" },
  "profile.noTelegramData": { es: "No se detectaron datos de Telegram", en: "No Telegram data detected" },
  "profile.openFromTelegram": { es: "Abre esta app desde Telegram", en: "Open this app from Telegram" },
  "profile.inProgress": { es: "En curso", en: "In progress" },
  "profile.hopsCompleted": { es: "Saltos completados", en: "Hops completed" },
  "profile.estimatedArrival": { es: "Llegada estimada", en: "Estimated arrival" },
  "profile.refreshStatus": { es: "Actualizar estado", en: "Refresh status" },
  "profile.loadingStatus": { es: "Consultando estado...", en: "Loading status..." },
  "profile.historyUpdated": { es: "Historial actualizado", en: "History updated" },
  "profile.completedTransfersUpdated": {
    es: "Se actualizaron las transferencias completadas",
    en: "Completed transfers were updated",
  },
  "profile.worldID": { es: "World ID", en: "World ID" },

  // Dashboard translations
  "dashboard.title": { es: "Inicio", en: "Home" },
  "dashboard.wallet": { es: "Wallet", en: "Wallet" },
  "dashboard.history": { es: "Historial", en: "History" },
  "dashboard.profile": { es: "Perfil", en: "Profile" },
  "dashboard.tokens": { es: "Tokens", en: "Tokens" },
  "dashboard.noTransactions": { es: "No hay transacciones recientes", en: "No recent transactions" },
  "dashboard.send": { es: "Enviar", en: "Send" },
  "dashboard.receive": { es: "Recibir", en: "Receive" },
  "dashboard.swap": { es: "Comprar", en: "Buy" },
  "dashboard.buy": { es: "Comprar", en: "Buy" },
  "dashboard.wallets": { es: "Wallets", en: "Wallets" },
  "dashboard.import": { es: "Importar", en: "Import" },
  "dashboard.noData": { es: "No hay datos disponibles", en: "No data available" },
  "dashboard.settings": { es: "Configuración", en: "Settings" },
  "dashboard.manage": { es: "Gestionar", en: "Manage" },
  "dashboard.unauthorized": {
    es: "Esta página solo está disponible para administradores.",
    en: "This page is only available to administrators.",
  },
  "dashboard.transactions": { es: "Transacciones", en: "Transactions" },
  "dashboard.recentActivity": { es: "Actividad reciente", en: "Recent activity" },
  "dashboard.totalBalance": { es: "Balance total", en: "Total balance" },
  "dashboard.assets": { es: "Activos", en: "Assets" },
  "dashboard.overview": { es: "Resumen", en: "Overview" },
  "dashboard.addToken": { es: "Agregar token", en: "Add token" },
  "dashboard.importWallet": { es: "Importar wallet", en: "Import wallet" },
  "dashboard.manageWallets": { es: "Gestionar wallets", en: "Manage wallets" },

  // Token Detail Modal
  "tokenDetail.title": { es: "Detalles del Token", en: "Token Details" },
  "tokenDetail.yourBalance": { es: "Tu Saldo", en: "Your Balance" },
  "tokenDetail.buy": { es: "Comprar", en: "Buy" },
  "tokenDetail.volume24h": { es: "Volumen 24h", en: "Volume 24h" },
  "tokenDetail.marketCap": { es: "Cap. Mercado", en: "Market Cap" },
  "tokenDetail.liquidity": { es: "Liquidez", en: "Liquidity" },
  "tokenDetail.viewOnExplorer": { es: "Ver en Explorer", en: "View on Explorer" },
  "tokenDetail.deleteToken": { es: "Eliminar Token", en: "Delete Token" },
  "tokenDetail.tokenDeleted": { es: "Token eliminado", en: "Token deleted" },
  "tokenDetail.tokenDeletedDesc": {
    es: "El token ha sido eliminado de tu lista",
    en: "Token has been removed from your list",
  },
  "tokenDetail.chartComingSoon": { es: "Gráfico próximamente", en: "Chart coming soon" },
  "tokenDetail.earn": { es: "Earn", en: "Earn" },

  // Wallet Manager
  "walletManager.title": { es: "Gestionar Wallets", en: "Manage Wallets" },
  "walletManager.addWallet": { es: "Agregar Wallet", en: "Add Wallet" },
  "walletManager.importPrivateKey": { es: "Importar con Private Key", en: "Import with Private Key" },
  "walletManager.pastePrivateKey": { es: "Pega tu private key aquí", en: "Paste your private key here" },
  "walletManager.import": { es: "Importar", en: "Import" },
  "walletManager.cancel": { es: "Cancelar", en: "Cancel" },
  "walletManager.invalidPrivateKey": { es: "Private key inválida", en: "Invalid private key" },
  "walletManager.walletImported": { es: "Wallet importada exitosamente", en: "Wallet imported successfully" },
  "walletManager.errorImporting": { es: "Error al importar wallet", en: "Error importing wallet" },
  "walletManager.myWallets": { es: "Mis Wallets", en: "My Wallets" },
  "walletManager.noWallets": { es: "No hay wallets guardadas", en: "No saved wallets" },
  "walletManager.remove": { es: "Eliminar", en: "Remove" },
  "walletManager.walletRemoved": { es: "Wallet eliminada", en: "Wallet removed" },

  // Token Selector
  "tokenSelector.searchTokens": { es: "Buscar tokens...", en: "Search tokens..." },
  "tokenSelector.popularTokens": { es: "Tokens populares", en: "Popular tokens" },
  "tokenSelector.yourTokens": { es: "Tus tokens", en: "Your tokens" },
  "tokenSelector.addCustomToken": { es: "Agregar token personalizado", en: "Add custom token" },
  "tokenSelector.noResults": { es: "No se encontraron tokens", en: "No tokens found" },
  "tokenSelector.balance": { es: "Balance", en: "Balance" },

  // Saved Wallets
  "savedWallets.title": { es: "Wallets Guardadas", en: "Saved Wallets" },
  "savedWallets.max": { es: "Máximo", en: "Maximum" },
  "savedWallets.addWallet": { es: "Agregar Wallet", en: "Add Wallet" },
  "savedWallets.noWallets": { es: "No hay wallets guardadas", en: "No saved wallets" },
  "savedWallets.save": { es: "Guardar", en: "Save" },
  "savedWallets.cancel": { es: "Cancelar", en: "Cancel" },
  "savedWallets.label": { es: "Etiqueta (ej: Wallet Trabajo)", en: "Label (e.g. Work Wallet)" },
  "savedWallets.copied": { es: "Copiado", en: "Copied" },
  "savedWallets.walletAdded": { es: "Wallet agregada", en: "Wallet added" },
  "savedWallets.walletAddedDesc": { es: "La wallet se ha guardado correctamente", en: "Wallet saved successfully" },
  "savedWallets.walletDeleted": { es: "Wallet eliminada", en: "Wallet deleted" },
  "savedWallets.walletDeletedDesc": {
    es: "La wallet se ha eliminado correctamente",
    en: "Wallet deleted successfully",
  },
  "savedWallets.cannotDelete": {
    es: "No puedes eliminar tu wallet de Worldcoin",
    en: "Cannot delete your Worldcoin wallet",
  },
  "savedWallets.enterAddress": { es: "Por favor ingresa una dirección de wallet", en: "Please enter a wallet address" },
  "savedWallets.enterValidAddress": {
    es: "Por favor ingresa una dirección válida",
    en: "Please enter a valid address",
  },
  "savedWallets.alreadyExists": { es: "Esta wallet ya está guardada", en: "This wallet is already saved" },
  "savedWallets.limitReached": { es: "Límite alcanzado", en: "Limit reached" },
  "savedWallets.limitReachedDesc": {
    es: "Solo puedes guardar máximo {max} wallets",
    en: "You can only save up to {max} wallets",
  },
  "savedWallets.modalTitle": { es: "Wallets", en: "Wallets" },

  // Home Page Translations
  "home.wallet": { es: "Wallet", en: "Wallet" },
  "home.history": { es: "History", en: "History" },
  "home.profile": { es: "Perfil", en: "Profile" },
  "home.tokens": { es: "Tokens", en: "Tokens" },
  "home.refresh": { es: "Actualizar", en: "Refresh" },
  "home.loading": { es: "Cargando tokens...", en: "Loading tokens..." },
  "home.importedTokens": { es: "Tokens Importados", en: "Imported Tokens" },
  "home.noPrice": { es: "No disponible", en: "Not available" },
  "home.tokensUpdated": { es: "Tokens actualizados", en: "Tokens updated" },
  "home.tokensUpdatedDesc": { es: "Los precios se han actualizado correctamente", en: "Prices updated successfully" },
  "home.noTransfersYet": { es: "No hay transferencias aún", en: "No transfers yet" },
  "home.updateTransfers": { es: "Actualizar", en: "Update" },
  "home.clearHistory": { es: "Borrar", en: "Clear" },
  "home.clearHistoryTitle": { es: "Borrar Historial", en: "Clear History" },
  "home.clearHistoryConfirm": {
    es: "¿Estás seguro de que quieres borrar todo el historial? Esta acción no se puede deshacer.",
    en: "Are you sure you want to clear all history? This action cannot be undone.",
  },
  "home.cancel": { es: "Cancelar", en: "Cancel" },
  "home.clear": { es: "Borrar", en: "Clear" },
  "home.historyCleared": { es: "Historial Eliminado", en: "History Cleared" },
  "home.historyClearedDesc": {
    es: "Se ha borrado todo el historial de transferencias",
    en: "All transfer history has been cleared",
  },
  "home.worldIDProfile": { es: "World ID", en: "World ID" },
  "home.username": { es: "Username", en: "Username" },
  "home.walletAddress": { es: "Wallet Address", en: "Wallet Address" },
  "home.noWorldID": { es: "No se detectó perfil de World ID", en: "No World ID profile detected" },
  "home.recipientLabel": { es: "Destinatario:", en: "Recipient:" },
  "home.dateLabel": { es: "Fecha:", en: "Date:" },
  "home.statusLabel": { es: "Estado:", en: "Status:" },
  "home.statusCompleted": { es: "Completado", en: "Completed" },
  "home.statusFailed": { es: "Fallida", en: "Failed" },
  "home.statusPending": { es: "En progreso", en: "In progress" },
  "home.transferFailed": { es: "transferencia(s) fallida(s)", en: "failed transfer(s)" },
  "home.contactSupport": { es: "Contactar Soporte", en: "Contact Support" },
  "home.transferDetails": { es: "Detalles de Transferencia", en: "Transfer Details" },
  "home.transferID": { es: "Transfer ID", en: "Transfer ID" },
  "home.amount": { es: "Cantidad", en: "Amount" },
  "home.recipient": { es: "Destinatario", en: "Recipient" },
  "home.routeStatus": { es: "Estado de la ruta", en: "Route Status" },
  "home.steps": { es: "Pasos:", en: "Steps:" },
  "home.estimatedTime": { es: "Tiempo estimado:", en: "Estimated time:" },
  "home.viewExplorer": { es: "Ver en explorador", en: "View on explorer" },
  "home.noPendingTransfers": { es: "Sin transferencias pendientes", en: "No pending transfers" },
  "home.noPendingDesc": {
    es: "No hay transferencias pendientes para actualizar",
    en: "No pending transfers to update",
  },
  "home.cooldownActive": { es: "Cooldown Activo", en: "Cooldown Active" },
  "home.cooldownDesc": {
    es: "Por favor espera {seconds}s antes de actualizar nuevamente",
    en: "Please wait {seconds}s before updating again",
  },
  "home.historyUpdated": { es: "Historial Actualizado", en: "History Updated" },
  "home.noChanges": { es: "Sin cambios", en: "No changes" },
  "home.noNewTransfers": {
    es: "No se encontraron nuevas transferencias completadas",
    en: "No new completed transfers found",
  },
  "home.send": { es: "Enviar", en: "Send" },
  "home.swap": { es: "Comprar", en: "Buy" },
  "home.wallets": { es: "Wallets", en: "Wallets" },
  "home.import": { es: "Importar", en: "Import" },
  "home.notAvailable": { es: "No disponible", en: "Not available" },
  "home.pricesUpdated": { es: "Precios actualizados correctamente", en: "Prices updated successfully" },
  "home.tokenAdded": { es: "Token añadido", en: "Token added" },
  "home.tokenAddedDesc": {
    es: "El token se ha añadido correctamente a tu lista",
    en: "Token has been added to your list successfully",
  },
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("es")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("vpnchain-language") as Language
    if (saved === "es" || saved === "en") {
      setLanguage(saved)
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("vpnchain-language", language)
      console.log("[v0] Language changed to:", language)
    }
  }, [language, mounted])

  const t = (key: string): string => {
    const translation = translations[key]?.[language]
    if (!translation) {
      console.warn(`[v0] Missing translation for key: ${key}`)
    }
    return translation || key
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    // Return default values during SSR
    return {
      language: "es" as Language,
      setLanguage: () => {},
      t: (key: string) => translations[key]?.["es"] || key,
    }
  }
  return context
}
