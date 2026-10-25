import { type Locale, type Messages, createTranslator } from '@/i18n'
import { type Models } from '@/models'

type PhotoDetailsProps = {
  camera: Models.PostCamera
  locale: Locale
  messages: Messages
}

const toCameraName = ({ make, model }: Models.PostCamera): string | undefined => {
  if (make && model) {
    return model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`
  }
  return model ?? make
}

const RECIPROCAL_TOLERANCE = 0.05

const toExposure = (exposure: number, format: Intl.NumberFormat): string => {
  const reciprocal = 1 / exposure
  const isReciprocalForm =
    exposure < 0.5 ||
    (exposure < 1 && Math.abs(reciprocal - Math.round(reciprocal)) < RECIPROCAL_TOLERANCE)
  return isReciprocalForm
    ? `1/${format.format(Math.round(reciprocal))} s`
    : `${format.format(exposure)} s`
}

export const PhotoDetails = ({ camera, locale, messages }: PhotoDetailsProps) => {
  const t = createTranslator(messages)
  const format = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  const parts = [
    toCameraName(camera),
    camera.lens,
    camera.focalLength === undefined ? undefined : `${format.format(camera.focalLength)} mm`,
    camera.aperture === undefined ? undefined : `ƒ/${format.format(camera.aperture)}`,
    camera.exposure === undefined ? undefined : toExposure(camera.exposure, format),
    camera.iso === undefined ? undefined : `ISO ${camera.iso}`,
    camera.takenOn
      ? t('camera.takenOn', {
          date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
            new Date(camera.takenOn),
          ),
        })
      : undefined,
  ].filter((part): part is string => part !== undefined)
  if (parts.length === 0) {
    return null
  }
  return (
    <p className="animate-fade-in px-5 pt-2 text-xs break-words text-muted-foreground">
      <span className="sr-only">{t('camera.label')}: </span>
      {parts.join(' · ')}
    </p>
  )
}
