import type { SignetStep } from '../types.js';

const STEPS: Array<{ key: SignetStep; label: string }> = [
  { key: 'upload', label: 'Upload' },
  { key: 'analyze', label: 'Analyze' },
  { key: 'sign', label: 'Sign' },
  { key: 'verify', label: 'Verify' },
];

interface StepTrackerProps {
  currentStep: SignetStep;
}

export function StepTracker({ currentStep }: StepTrackerProps) {
  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="signet-step-tracker">
      {STEPS.map((step, i) => (
        <div key={step.key} className="signet-step-tracker-item">
          <div
            className={`signet-step-dot ${i <= stepIndex ? 'signet-step-dot--active' : ''} ${i < stepIndex ? 'signet-step-dot--done' : ''}`}
          >
            {i < stepIndex ? '✓' : i + 1}
          </div>
          <span
            className={`signet-step-label ${i <= stepIndex ? 'signet-step-label--active' : ''}`}
          >
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <div
              className={`signet-step-line ${i < stepIndex ? 'signet-step-line--done' : ''}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}