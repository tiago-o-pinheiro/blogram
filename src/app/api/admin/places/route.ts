import { withErrorHandler } from '@/server/errors/with-error-handler'
import { requireSession } from '@/server/modules/auth/guards/auth.guard'
import { placeController } from '@/server/modules/places/controllers/place.controller'

export const GET = withErrorHandler(requireSession(placeController.search))
