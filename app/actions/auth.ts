"use server"

import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { auth } from "@/auth"

export async function registerUser(formData: FormData) {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!name || !email || !password) {
        return { success: false, error: "Semua field harus diisi" }
    }

    try {
        // Cek apakah user sudah ada
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return { success: false, error: "Email sudah terdaftar" }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Buat user baru
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            }
        })

        // Buat profil default
        const apiKey = `wappin_${crypto.randomBytes(16).toString("hex")}`
        const userCode = `WPIN-${crypto.randomBytes(4).toString("hex").toUpperCase()}`
        
        await prisma.profile.create({
            data: {
                userId: user.id,
                plan: "Free",
                apiKey: apiKey,
                user_code: userCode
            }
        })

        return { success: true }
    } catch (error) {
        console.error("Registration error:", error)
        return { success: false, error: "Terjadi kesalahan saat pendaftaran" }
    }
}

export async function updateUserProfile(name: string) {
    try {
        const session = await auth()
        const userId = session?.user?.id

        if (!userId) {
            return { success: false, error: "Unauthorized" }
        }

        await prisma.user.update({
            where: { id: userId },
            data: { name }
        })

        return { success: true }
    } catch (error) {
        console.error("Update profile error:", error)
        return { success: false, error: "Gagal memperbarui profil" }
    }
}
