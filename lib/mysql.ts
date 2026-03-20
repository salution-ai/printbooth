import mysql from "serverless-mysql"

const db = mysql({
  config: {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT),
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
  },
})

export async function query(q: string, values: (string | number | boolean)[] | string | number = []) {
  const queryStartTime = Date.now()
  console.log(`[${new Date().toISOString()}] SQL QUERY START: ${q.substring(0, 100)}${q.length > 100 ? "..." : ""}`)

  try {
    const results = await db.query(q, values)
    await db.end() // Đóng kết nối sau khi truy vấn hoàn tất
    console.log(`[${new Date().toISOString()}] SQL QUERY DONE: Hoàn thành sau ${Date.now() - queryStartTime}ms`)
    return results
  } catch (e: any) {
    try {
      await db.end() // Đảm bảo kết nối được đóng ngay cả khi có lỗi
    } catch (endError) {
      console.error("Error closing connection:", endError)
    }
    console.error(`[${new Date().toISOString()}] SQL ERROR sau ${Date.now() - queryStartTime}ms:`, e)
    throw new Error(e.message)
  }
}

export async function beginTransaction() {
  await db.query("START TRANSACTION")
}

export async function commit() {
  await db.query("COMMIT")
  await db.end() // Đóng kết nối sau khi commit
}

export async function rollback() {
  await db.query("ROLLBACK")
  await db.end() // Đóng kết nối sau khi rollback
}

// Hàm mới để đóng tất cả kết nối
export async function closeAllConnections() {
  try {
    await db.end()
    console.log("All database connections closed")
  } catch (error) {
    console.error("Error closing all connections:", error)
  }
}
