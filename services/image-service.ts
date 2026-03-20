import { storage, db } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { v4 as uuidv4 } from "uuid"

// Interface cho thông tin ảnh lưu trữ
export interface StoredImage {
  id: string
  url: string
  storagePath: string
  originalFilename: string
  createdAt: Date
  expiresAt: Date
  sessionId: string
  userId?: string
  cartId?: string
  metadata?: Record<string, any>
}

// Interface cho thông tin giỏ hàng
export interface CartItem {
  id: string
  previewUrl: string
  templateId: string
  imageIds: string[]
  createdAt: Date
  price: number
  userId?: string
  sessionId: string
}

// Upload ảnh lên Firebase Storage
export async function uploadImage(file: File, sessionId: string, userId?: string): Promise<StoredImage> {
  try {
    // Tạo đường dẫn lưu trữ
    const fileExtension = file.name.split(".").pop()
    const fileName = `${uuidv4()}.${fileExtension}`
    const folderPath = userId ? `users/${userId}/images` : `anonymous/${sessionId}/images`
    const storagePath = `${folderPath}/${fileName}`

    // Tạo reference đến vị trí lưu trữ
    const storageRef = ref(storage, storagePath)

    // Upload file
    await uploadBytes(storageRef, file)

    // Lấy URL download
    const downloadURL = await getDownloadURL(storageRef)

    // Tính thời gian hết hạn (2 ngày sau)
    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setDate(now.getDate() + 2)

    // Lưu thông tin ảnh vào Firestore
    const imageData: Omit<StoredImage, "id"> = {
      url: downloadURL,
      storagePath,
      originalFilename: file.name,
      createdAt: now,
      expiresAt,
      sessionId,
      userId,
      metadata: {
        size: file.size,
        type: file.type,
      },
    }

    const docRef = await addDoc(collection(db, "images"), {
      ...imageData,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
    })

    return {
      id: docRef.id,
      ...imageData,
    }
  } catch (error) {
    console.error("Error uploading image:", error)
    throw error
  }
}

// Lấy ảnh theo ID
export async function getImageById(imageId: string): Promise<StoredImage | null> {
  try {
    const imageSnapshot = await getDocs(query(collection(db, "images"), where("__name__", "==", imageId)))

    if (imageSnapshot.empty) {
      return null
    }

    const imageData = imageSnapshot.docs[0].data()

    return {
      id: imageSnapshot.docs[0].id,
      url: imageData.url,
      storagePath: imageData.storagePath,
      originalFilename: imageData.originalFilename,
      createdAt: imageData.createdAt.toDate(),
      expiresAt: imageData.expiresAt.toDate(),
      sessionId: imageData.sessionId,
      userId: imageData.userId,
      cartId: imageData.cartId,
      metadata: imageData.metadata,
    }
  } catch (error) {
    console.error("Error getting image:", error)
    throw error
  }
}

// Lấy tất cả ảnh của một phiên làm việc
export async function getSessionImages(sessionId: string): Promise<StoredImage[]> {
  try {
    const imagesSnapshot = await getDocs(query(collection(db, "images"), where("sessionId", "==", sessionId)))

    return imagesSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        url: data.url,
        storagePath: data.storagePath,
        originalFilename: data.originalFilename,
        createdAt: data.createdAt.toDate(),
        expiresAt: data.expiresAt.toDate(),
        sessionId: data.sessionId,
        userId: data.userId,
        cartId: data.cartId,
        metadata: data.metadata,
      }
    })
  } catch (error) {
    console.error("Error getting session images:", error)
    throw error
  }
}

// Lấy tất cả ảnh của một người dùng
export async function getUserImages(userId: string): Promise<StoredImage[]> {
  try {
    const imagesSnapshot = await getDocs(query(collection(db, "images"), where("userId", "==", userId)))

    return imagesSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        url: data.url,
        storagePath: data.storagePath,
        originalFilename: data.originalFilename,
        createdAt: data.createdAt.toDate(),
        expiresAt: data.expiresAt.toDate(),
        sessionId: data.sessionId,
        userId: data.userId,
        cartId: data.cartId,
        metadata: data.metadata,
      }
    })
  } catch (error) {
    console.error("Error getting user images:", error)
    throw error
  }
}

// Xóa ảnh
export async function deleteImage(imageId: string): Promise<void> {
  try {
    // Lấy thông tin ảnh
    const image = await getImageById(imageId)

    if (!image) {
      throw new Error("Image not found")
    }

    // Xóa file từ Storage
    const storageRef = ref(storage, image.storagePath)
    await deleteObject(storageRef)

    // Xóa document từ Firestore
    await deleteDoc(doc(db, "images", imageId))
  } catch (error) {
    console.error("Error deleting image:", error)
    throw error
  }
}

// Lưu ảnh preview vào giỏ hàng
export async function saveToCart(
  previewUrl: string,
  templateId: string,
  imageIds: string[],
  price: number,
  sessionId: string,
  userId?: string,
): Promise<CartItem> {
  try {
    // Upload ảnh preview
    const response = await fetch(previewUrl)
    const blob = await response.blob()
    const file = new File([blob], `preview-${uuidv4()}.jpg`, { type: "image/jpeg" })

    // Tạo đường dẫn lưu trữ cho ảnh preview
    const storagePath = userId ? `users/${userId}/cart/${file.name}` : `anonymous/${sessionId}/cart/${file.name}`

    const storageRef = ref(storage, storagePath)

    // Upload file
    await uploadBytes(storageRef, file)

    // Lấy URL download
    const downloadURL = await getDownloadURL(storageRef)

    // Lưu thông tin vào giỏ hàng
    const cartData = {
      previewUrl: downloadURL,
      templateId,
      imageIds,
      createdAt: serverTimestamp(),
      price,
      userId,
      sessionId,
    }

    const docRef = await addDoc(collection(db, "cart"), cartData)

    // Cập nhật cartId cho các ảnh
    for (const imageId of imageIds) {
      await updateDoc(doc(db, "images", imageId), {
        cartId: docRef.id,
      })
    }

    return {
      id: docRef.id,
      previewUrl: downloadURL,
      templateId,
      imageIds,
      createdAt: new Date(),
      price,
      userId,
      sessionId,
    }
  } catch (error) {
    console.error("Error saving to cart:", error)
    throw error
  }
}

// Lấy các item trong giỏ hàng
export async function getCartItems(sessionId: string, userId?: string): Promise<CartItem[]> {
  try {
    let cartQuery

    if (userId) {
      cartQuery = query(collection(db, "cart"), where("userId", "==", userId))
    } else {
      cartQuery = query(collection(db, "cart"), where("sessionId", "==", sessionId))
    }

    const cartSnapshot = await getDocs(cartQuery)

    return cartSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        previewUrl: data.previewUrl,
        templateId: data.templateId,
        imageIds: data.imageIds,
        createdAt: data.createdAt.toDate(),
        price: data.price,
        userId: data.userId,
        sessionId: data.sessionId,
      }
    })
  } catch (error) {
    console.error("Error getting cart items:", error)
    throw error
  }
}

// Xóa item khỏi giỏ hàng
export async function removeFromCart(cartItemId: string): Promise<void> {
  try {
    // Lấy thông tin cart item
    const cartSnapshot = await getDocs(query(collection(db, "cart"), where("__name__", "==", cartItemId)))

    if (cartSnapshot.empty) {
      throw new Error("Cart item not found")
    }

    const cartData = cartSnapshot.docs[0].data()

    // Xóa liên kết cartId từ các ảnh
    for (const imageId of cartData.imageIds) {
      await updateDoc(doc(db, "images", imageId), {
        cartId: null,
      })
    }

    // Xóa ảnh preview từ Storage
    if (cartData.previewUrl) {
      const previewPath = cartData.previewUrl.split("?")[0].split("/o/")[1].replace(/%2F/g, "/")
      const previewRef = ref(storage, decodeURIComponent(previewPath))
      await deleteObject(previewRef)
    }

    // Xóa document từ Firestore
    await deleteDoc(doc(db, "cart", cartItemId))
  } catch (error) {
    console.error("Error removing from cart:", error)
    throw error
  }
}
