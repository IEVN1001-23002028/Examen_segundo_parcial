import mysql.connector

from config import (
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME
)

try:
    conexion = mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME
    )

    if conexion.is_connected():
        cursor = conexion.cursor()

        cursor.execute("SELECT DATABASE()")
        resultado = cursor.fetchone()

        print("Conexión exitosa a MySQL")
        print("Base de datos:", resultado[0])

        cursor.execute("SHOW TABLES")
        tablas = cursor.fetchall()

        print("Tablas encontradas:")

        for tabla in tablas:
            print("-", tabla[0])

        cursor.close()

except mysql.connector.Error as error:
    print("Error al conectar con MySQL:", error)

finally:
    if "conexion" in locals() and conexion.is_connected():
        conexion.close()
        print("Conexión cerrada correctamente")