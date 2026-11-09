
import mysql.connector
import unicodedata

from decimal import Decimal
from flask import Blueprint, jsonify, request

from config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

ventas_bp = Blueprint("ventas", __name__)

DIAS = {
    "lunes": 0,
    "martes": 1,
    "miercoles": 2,
    "jueves": 3,
    "viernes": 4,
    "sabado": 5,
    "domingo": 6
}

MESES = {
    "enero": 1,
    "febrero": 2,
    "marzo": 3,
    "abril": 4,
    "mayo": 5,
    "junio": 6,
    "julio": 7,
    "agosto": 8,
    "septiembre": 9,
    "setiembre": 9,
    "octubre": 10,
    "noviembre": 11,
    "diciembre": 12
}


def conectar():
    return mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME
    )


def normalizar(texto):
    texto = str(texto).strip().lower()
    texto = unicodedata.normalize("NFD", texto)

    return "".join(
        caracter
        for caracter in texto
        if unicodedata.category(caracter) != "Mn"
    )


def obtener_anio():
    valor = request.args.get("anio")

    if valor is None or valor == "":
        return None

    try:
        anio = int(valor)

        if anio < 1 or anio > 9999:
            raise ValueError()

        return anio

    except ValueError:
        raise ValueError("El año debe ser un número válido")


def consultar_ventas(filtro, numero, anio=None):
    conexion = None
    cursor = None

    filtros = {
        "dia": "WEEKDAY(fecha_pedido)",
        "mes": "MONTH(fecha_pedido)"
    }

    if filtro not in filtros:
        raise ValueError("Filtro no válido")

    try:
        conexion = conectar()
        cursor = conexion.cursor(dictionary=True)

        consulta = f"""
            SELECT
                id_pedido,
                nombre_cliente,
                direccion,
                telefono,
                fecha_pedido,
                total
            FROM pedidos
            WHERE {filtros[filtro]} = %s
        """

        parametros = [numero]

        if anio is not None:
            consulta += " AND YEAR(fecha_pedido) = %s"
            parametros.append(anio)

        consulta += " ORDER BY fecha_pedido DESC, id_pedido DESC"

        cursor.execute(consulta, tuple(parametros))
        ventas = cursor.fetchall()

        total_acumulado = Decimal("0")

        for venta in ventas:
            venta["fecha_pedido"] = venta["fecha_pedido"].isoformat()
            total_acumulado += venta["total"]
            venta["total"] = float(venta["total"])

        return {
            "exito": True,
            "cantidad_ventas": len(ventas),
            "total_acumulado": float(total_acumulado),
            "ventas": ventas
        }

    finally:
        if cursor is not None:
            cursor.close()

        if conexion is not None and conexion.is_connected():
            conexion.close()


@ventas_bp.route("/dia", methods=["GET"])
def ventas_por_dia():
    dia = normalizar(request.args.get("dia", ""))

    if dia not in DIAS:
        return jsonify({
            "exito": False,
            "mensaje": "Introduce un día válido de lunes a domingo"
        }), 400

    try:
        anio = obtener_anio()
        resultado = consultar_ventas("dia", DIAS[dia], anio)

        resultado["dia"] = dia
        resultado["anio"] = anio

        return jsonify(resultado)

    except ValueError as error:
        return jsonify({
            "exito": False,
            "mensaje": str(error)
        }), 400

    except mysql.connector.Error:
        return jsonify({
            "exito": False,
            "mensaje": "No fue posible consultar las ventas"
        }), 500


@ventas_bp.route("/mes", methods=["GET"])
def ventas_por_mes():
    mes = normalizar(request.args.get("mes", ""))

    if mes not in MESES:
        return jsonify({
            "exito": False,
            "mensaje": "Introduce un mes válido"
        }), 400

    try:
        anio = obtener_anio()
        resultado = consultar_ventas("mes", MESES[mes], anio)

        resultado["mes"] = mes
        resultado["anio"] = anio

        return jsonify(resultado)

    except ValueError as error:
        return jsonify({
            "exito": False,
            "mensaje": str(error)
        }), 400

    except mysql.connector.Error:
        return jsonify({
            "exito": False,
            "mensaje": "No fue posible consultar las ventas"
        }), 500


@ventas_bp.route("/resumen", methods=["GET"])
def resumen_ventas():
    conexion = None
    cursor = None

    try:
        conexion = conectar()
        cursor = conexion.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                COUNT(*) AS cantidad_ventas,
                COALESCE(SUM(total), 0) AS total_acumulado
            FROM pedidos
        """)

        resultado = cursor.fetchone()

        return jsonify({
            "exito": True,
            "cantidad_ventas": resultado["cantidad_ventas"],
            "total_acumulado": float(resultado["total_acumulado"])
        })

    except mysql.connector.Error:
        return jsonify({
            "exito": False,
            "mensaje": "No fue posible obtener el resumen de ventas"
        }), 500

    finally:
        if cursor is not None:
            cursor.close()

        if conexion is not None and conexion.is_connected():
            conexion.close()
