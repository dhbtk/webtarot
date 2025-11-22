const USER_ID_KEY = 'userId'

export const getUserId = () => {
  const value = localStorage.getItem(USER_ID_KEY)
  if (value !== null) return value
  const generated = crypto.randomUUID()
  setUserId(generated)
  return generated
}

export const setUserId = (userId: string) => localStorage.setItem(USER_ID_KEY, userId)
