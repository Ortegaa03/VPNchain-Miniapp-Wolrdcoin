'use client'

import { CheckCircle2, Circle, Clock, Loader2 } from 'lucide-react'
import { useLanguage } from '@/lib/translations'

type TransactionTrackerProps = {
  currentStep: number
  isSecureMode?: boolean
}

export function TransactionTracker({ currentStep, isSecureMode = false }: TransactionTrackerProps) {
  const { t } = useLanguage()

  const steps = isSecureMode ? [
    { id: 1, label: t('tracker.step1'), description: t('tracker.paymentDetected') },
    { id: 2, label: t('tracker.step2'), description: t('tracker.verifyingFunds') },
    { id: 3, label: t('tracker.step3'), description: t('tracker.routing') },
    { id: 4, label: t('tracker.step4'), description: t('tracker.executing') },
    { id: 5, label: t('profile.inProgress'), description: t('invoice.secureInProgress') },
  ] : [
    { id: 1, label: t('tracker.step1'), description: t('tracker.paymentDetected') },
    { id: 2, label: t('tracker.step2'), description: t('tracker.verifyingFunds') },
    { id: 3, label: t('tracker.step3'), description: t('tracker.routing') },
    { id: 4, label: t('tracker.step4'), description: t('tracker.executing') },
    { id: 5, label: t('tracker.step5'), description: t('tracker.completed') },
  ]

  const getStepIcon = (stepId: number) => {
    if (currentStep > stepId) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
    if (currentStep === stepId) {
      if (isSecureMode && stepId === 5) {
        return <Clock className="h-4 w-4 text-blue-500" />
      }
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />
    }
    return <Circle className="h-4 w-4 text-muted-foreground/30" />
  }

  const getStepColor = (stepId: number) => {
    if (currentStep > stepId) return 'text-green-500'
    if (currentStep === stepId) {
      if (isSecureMode && stepId === 5) return 'text-blue-400'
      return 'text-primary'
    }
    return 'text-muted-foreground/50'
  }

  return (
    <div className="bg-[#191B1F] border border-border/50 rounded-lg p-3 space-y-2">
      <h3 className="text-xs font-semibold mb-2">{t('confirm.transferMode')}</h3>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-start gap-2">
          <div className="shrink-0 mt-0.5">
            {getStepIcon(step.id)}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[11px] font-medium ${getStepColor(step.id)}`}>
              {step.label}
            </p>
            {currentStep === step.id && (
              <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">
                {step.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
