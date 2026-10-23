export const toSignInMessage = (status: number) =>
  status === 401 ? 'Wrong email or password.' : 'We could not sign you in. Try again.'

export const toSignUpMessage = (status: number) =>
  status === 422
    ? 'An account with this email already exists.'
    : 'We could not create your account. Try again.'
