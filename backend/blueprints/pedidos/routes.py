
from datetime import date
from decimal import Decimal

import mysql.connector
from flask import Blueprint, jsonify, request

from config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

pedidos_bp = Blueprint("pedidos", __name__)

PRECIOS = {
    "Chica": Decimal("40"),
    "Mediana": Decimal("80"),
    "Grande": Decimal("120")
}

INGREDIENTES = {"Jamón", "Piña", "Champiñones"}
PRECIO_INGREDIENTE = Decimal("10")


def conectar():
    return mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME
    )


def convertir_pedido(pedido):
    pedido["fecha_pedido"] = pedido["fecha_pedido"].isoformat()
    pedido["total"] = float(pedido["total"])
    return pedido


def validar_pizzas(pizzas):
    detalles = []
    total = Decimal("0")

    if not isinstance(pizzas, list) or not pizzas:
        raise ValueError("Debes agregar al menos una pizza")

    for pizza in pizzas:
        if not isinstance(pizza, dict):
            raise ValueError("Los datos de una pizza no son válidos")

        tamano = pizza.get("tamano")
        cantidad = pizza.get("cantidad")
        ingredientes = pizza.get("ingredientes", [])

        if tamano not in PRECIOS:
            raise ValueError("Tamaño de pizza no válido")

        if isinstance(cantidad, bool) or not isinstance(cantidad, int):
            raise ValueError("La cantidad debe ser un número entero")

        if cantidad < 1 or cantidad > 100:
            raise ValueError("La cantidad debe estar entre 1 y 100")

        if isinstance(ingredientes, str):
            ingredientes = [
                i.strip()
                for i in ingredientes.split(",")
                if i.strip()
            ]

        if not isinstance(ingredientes, list):
            raise ValueError("Los ingredientes no son válidos")

        if (
            len(ingredientes) != len(set(ingredientes))
            or any(i not in INGREDIENTES for i in ingredientes)
        ):
            raise ValueError("Hay ingredientes incorrectos o repetidos")

        subtotal = (
            PRECIOS[tamano]
            + PRECIO_INGREDIENTE * len(ingredientes)
        ) * cantidad

        detalles.append({
            "tamano": tamano,
            "ingredientes": ", ".join(ingredientes),
            "cantidad": cantidad,
            "subtotal": subtotal
        })

        total += subtotal

    return detalles, total


@pedidos_bp.route("/saludo", methods=["GET"])
def saludo():
    return jsonify({
        "exito": True,
        "mensaje": "Módulo de pedidos funcionando"
    })


@pedidos_bp.route("", methods=["POST"])
def registrar_pedido():
    datos = request.get_json(silent=True)

    if not isinstance(datos, dict):
        return jsonify({
            "exito": False,
            "mensaje": "Debes enviar un objeto JSON válido"
        }), 400

    nombre = str(datos.get("nombre", "")).strip()
    direccion = str(datos.get("direccion", "")).strip()
    telefono = str(datos.get("telefono", "")).strip()

    if not nombre or not direccion or not telefono:
        return jsonify({
            "exito": False,
            "mensaje": "Completa los datos del cliente"
        }), 400

    if len(nombre) > 100 or len(direccion) > 255 or len(telefono) > 20:
        return jsonify({
            "exito": False,
            "mensaje": "Los datos del cliente exceden la longitud permitida"
        }), 400

    try:
        fecha_texto = datos.get("fecha_pedido")
        fecha = date.fromisoformat(fecha_texto) if fecha_texto else date.today()
        detalles, total = validar_pizzas(datos.get("pizzas"))

    except (ValueError, TypeError) as error:
        return jsonify({
            "exito": False,
            "mensaje": str(error)
        }), 400

    conexion = None
    cursor = None

    try:
        conexion = conectar()
        conexion.start_transaction()
        cursor = conexion.cursor()

        cursor.execute(
            """
            INSERT INTO pedidos
            (nombre_cliente, direccion, telefono, fecha_pedido, total)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (nombre, direccion, telefono, fecha, total)
        )

        id_pedido = cursor.lastrowid

        for pizza in detalles:
            cursor.execute(
                """
                INSERT INTO detalle_pedido
                (id_pedido, tamano, ingredientes, cantidad, subtotal)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    id_pedido,
                    pizza["tamano"],
                    pizza["ingredientes"],
                    pizza["cantidad"],
                    pizza["subtotal"]
                )
            )

        conexion.commit()

        return jsonify({
            "exito": True,
            "mensaje": "Pedido registrado correctamente",
            "id_pedido": id_pedido,
            "total": float(total)
        }), 201

    except mysql.connector.Error:
        if conexion is not None and conexion.is_connected():
            conexion.rollback()

        return jsonify({
            "exito": False,
            "mensaje": "No fue posible guardar el pedido"
        }), 500

    finally:
        if cursor is not None:
            cursor.close()

        if conexion is not None and conexion.is_connected():
            conexion.close()


@pedidos_bp.route("", methods=["GET"])
def listar_pedidos():
    conexion = None
    cursor = None

    try:
        conexion = conectar()
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id_pedido, nombre_cliente, direccion,
                   telefono, fecha_pedido, total
            FROM pedidos
            ORDER BY id_pedido DESC
            """
        )

        pedidos = [
            convertir_pedido(pedido)
            for pedido in cursor.fetchall()
        ]

        return jsonify({
            "exito": True,
            "pedidos": pedidos
        })

    except mysql.connector.Error:
        return jsonify({
            "exito": False,
            "mensaje": "No fue posible consultar los pedidos"
        }), 500

    finally:
        if cursor is not None:
            cursor.close()

        if conexion is not None and conexion.is_connected():
            conexion.close()


@pedidos_bp.route("/<int:id_pedido>", methods=["GET"])
def obtener_pedido(id_pedido):
    conexion = None
    cursor = None

    try:
        conexion = conectar()
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id_pedido, nombre_cliente, direccion,
                   telefono, fecha_pedido, total
            FROM pedidos
            WHERE id_pedido = %s
            """,
            (id_pedido,)
        )

        pedido = cursor.fetchone()

        if pedido is None:
            return jsonify({
                "exito": False,
                "mensaje": "Pedido no encontrado"
            }), 404

        cursor.execute(
            """
            SELECT id_detalle, tamano, ingredientes,
                   cantidad, subtotal
            FROM detalle_pedido
            WHERE id_pedido = %s
            ORDER BY id_detalle
            """,
            (id_pedido,)
        )

        detalles = cursor.fetchall()

        for pizza in detalles:
            pizza["subtotal"] = float(pizza["subtotal"])

        pedido = convertir_pedido(pedido)
        pedido["pizzas"] = detalles

        return jsonify({
            "exito": True,
            "pedido": pedido
        })

    except mysql.connector.Error:
        return jsonify({
            "exito": False,
            "mensaje": "No fue posible consultar el pedido"
        }), 500

    finally:
        if cursor is not None:
            cursor.close()

        if conexion is not None and conexion.is_connected():
            conexion.close()
