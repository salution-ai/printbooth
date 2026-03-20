import { NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "daard9oly",
  api_key: process.env.CLOUDINARY_API_KEY || "995419386858671",
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: Request) {
  try {
    const { publicId } = await request.json()

    if (!publicId) {
      return NextResponse.json({ error: "Public ID is required" }, { status: 400 })
    }

    // Delete the image from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId)

    if (result.result !== "ok") {
      return NextResponse.json({ error: "Failed to delete image" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Image deleted successfully" })
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
