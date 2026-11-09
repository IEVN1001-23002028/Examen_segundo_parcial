
from flask import Flask, jsonify
from flask_cors import CORS

from blueprints.pedidos.routes import pedidos_bp
from blueprints.ventas.routes import ventas_bp

app = Flask(__name__)

CORS(app, origins=["http://localhost:4200", "http://127.0.0.1:4200"])

app.register_blueprint(pedidos_bp, url_prefix="/api/pedidos")
app.register_blueprint(ventas_bp, url_prefix="/api/ventas")


@app.route("/prueba", methods=["GET"])
def prueba():
    return jsonify({
        "exito": True,
        "mensaje": "Servidor Flask funcionando"
    })