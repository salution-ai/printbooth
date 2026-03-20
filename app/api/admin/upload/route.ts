import { type NextRequest, NextResponse } from "next/server"

// Cloudinary configuration
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "daard9oly"
const apiKey = process.env.CLOUDINARY_API_KEY || "995419386858671"
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || "photolab_preset"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Tạo form data để upload lên Cloudinary
    const cloudinaryFormData = new FormData()
    cloudinaryFormData.append("file", file)
    cloudinaryFormData.append("upload_preset", uploadPreset)
    cloudinaryFormData.append("cloud_name", cloudName)
    cloudinaryFormData.append("folder", "photolab/admin/templates")

    // Upload file lên Cloudinary
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: cloudinaryFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Cloudinary upload failed:", errorText)
      return NextResponse.json({ error: "Upload failed" }, { status: 500 })
    }

    const data = await response.json()

    return NextResponse.json({
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
    })
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Giới hạn kích thước file upload (100MB)
export const config = {
  api: {
    bodyParser: false,
    responseLimit: "100mb",
  },
}
