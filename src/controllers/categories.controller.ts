import { Request, Response } from 'express'
import Category from '../models/Category'
import Product from '../models/Product'
import { ApiError } from '../utils/ApiError'
import asyncHandler from '../utils/asyncHandler'

export const getCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 })
  res.json({ success: true, data: categories })
})

export const getCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findOne({ slug: req.params.slug, isActive: true })
  if (!category) throw new ApiError(404, 'Categoría no encontrada')

  const productCount = await Product.countDocuments({ category: category._id, isActive: true })
  res.json({ success: true, data: { ...category.toObject(), productCount } })
})

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.create(req.body)
  res.status(201).json({ success: true, data: category })
})

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
  if (!category) throw new ApiError(404, 'Categoría no encontrada')
  res.json({ success: true, data: category })
})

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  )
  if (!category) throw new ApiError(404, 'Categoría no encontrada')
  res.json({ success: true, message: 'Categoría desactivada' })
})
