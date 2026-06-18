import { Request, Response, NextFunction, RequestHandler } from 'express'
import { ZodSchema } from 'zod'
import { ApiError } from '../utils/ApiError'

const validate = (schema: ZodSchema): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const msg = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      return next(new ApiError(400, msg))
    }
    req.body = result.data
    next()
  }

export { validate }
export default validate
