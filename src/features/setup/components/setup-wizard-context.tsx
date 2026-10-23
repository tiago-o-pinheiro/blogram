'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import { type ReactNode } from 'react'

import { type Profile, type SetupOwner } from '@/models/models'

export type SetupStep = 1 | 2 | 3

type SetupWizardState = {
  step: SetupStep
  profile: Profile | null
  photoPreviewUrl: string | null
  owner: SetupOwner
}

type SetupWizardActions = {
  goTo: (step: SetupStep) => void
  setProfile: (profile: Profile | null) => void
  setPhotoPreviewUrl: (url: string | null) => void
  setOwner: (owner: SetupOwner) => void
}

type SetupWizardProviderProps = {
  initialProfile: Profile | null
  children: ReactNode
}

const EMPTY_OWNER: SetupOwner = { identifier: '', password: '', passwordConfirmation: '' }

const SetupWizardStateContext = createContext<SetupWizardState | null>(null)
const SetupWizardActionsContext = createContext<SetupWizardActions | null>(null)

export const SetupWizardProvider = ({ initialProfile, children }: SetupWizardProviderProps) => {
  const [step, setStep] = useState<SetupStep>(1)
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [owner, setOwner] = useState<SetupOwner>(EMPTY_OWNER)

  const state = useMemo<SetupWizardState>(
    () => ({ step, profile, photoPreviewUrl, owner }),
    [step, profile, photoPreviewUrl, owner],
  )
  const actions = useMemo<SetupWizardActions>(
    () => ({ goTo: setStep, setProfile, setPhotoPreviewUrl, setOwner }),
    [],
  )

  return (
    <SetupWizardActionsContext.Provider value={actions}>
      <SetupWizardStateContext.Provider value={state}>{children}</SetupWizardStateContext.Provider>
    </SetupWizardActionsContext.Provider>
  )
}

export const useSetupWizardState = (): SetupWizardState => {
  const value = useContext(SetupWizardStateContext)
  if (!value) {
    throw new Error('useSetupWizardState must be used within a SetupWizardProvider')
  }
  return value
}

export const useSetupWizardActions = (): SetupWizardActions => {
  const value = useContext(SetupWizardActionsContext)
  if (!value) {
    throw new Error('useSetupWizardActions must be used within a SetupWizardProvider')
  }
  return value
}
