
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, Observable, tap } from 'rxjs';

export interface Pizza {
  tamano: string;
  ingredientes: string | string[];
  cantidad: number;
  subtotal: number;
}

export interface Cliente {
  nombre: string;
  direccion: string;
  telefono: string;
  fecha_pedido?: string;
}

export interface Venta {
  id_pedido: number;
  nombre_cliente: string;
  direccion: string;
  telefono: string;
  fecha_pedido: string;
  total: number;
}

export interface DetallePizza {
  id_detalle: number;
  tamano: string;
  ingredientes: string;
  cantidad: number;
  subtotal: number;
}

export interface PedidoGuardado extends Venta {
  pizzas: DetallePizza[];
}

export interface RespuestaPedido {
  exito: boolean;
  mensaje: string;
  id_pedido: number;
  total: number;
}

export interface RespuestaVentas {
  exito: boolean;
  cantidad_ventas: number;
  total_acumulado: number;
  ventas: Venta[];
  mensaje?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PedidoService {

  private apiUrl = 'http://127.0.0.1:5000/api';

  private pizzasSubject = new BehaviorSubject<Pizza[]>([]);
  private clienteSubject = new BehaviorSubject<Cliente | null>(null);
  private pedidoFinalizadoSubject = new Subject<void>();

  pizzas$ = this.pizzasSubject.asObservable();
  pedidoFinalizado$ = this.pedidoFinalizadoSubject.asObservable();

  constructor(private http: HttpClient) {}

  establecerCliente(cliente: Cliente): void {
    this.clienteSubject.next(cliente);
  }

  obtenerCliente(): Cliente | null {
    return this.clienteSubject.value;
  }

  agregarPizza(pizza: Pizza): void {
    const pizzas = [...this.pizzasSubject.value, pizza];

    this.pizzasSubject.next(pizzas);

    console.log('Pizzas en el servicio:', this.pizzasSubject.value);
  }

  obtenerPizzas(): Pizza[] {
    return this.pizzasSubject.value;
  }

  eliminarPizza(index: number): void {
    const pizzas = [...this.pizzasSubject.value];

    if (index < 0 || index >= pizzas.length) {
      return;
    }

    pizzas.splice(index, 1);
    this.pizzasSubject.next(pizzas);
  }

  calcularTotal(): number {
    return this.pizzasSubject.value.reduce(
      (total, pizza) => total + pizza.subtotal,
      0
    );
  }

  limpiarPedido(): void {
    this.pizzasSubject.next([]);
    this.clienteSubject.next(null);
  }

  terminarPedido(): Observable<RespuestaPedido> {
    const cliente = this.clienteSubject.value;
    const pizzas = this.pizzasSubject.value;

    if (!cliente) {
      throw new Error('Debes completar los datos del cliente');
    }

    if (pizzas.length === 0) {
      throw new Error('Debes agregar al menos una pizza');
    }

    const datos = {
      ...cliente,
      pizzas: pizzas.map(pizza => ({
        tamano: pizza.tamano,
        ingredientes: typeof pizza.ingredientes === 'string'
          ? pizza.ingredientes.split(',').map(i => i.trim()).filter(Boolean)
          : pizza.ingredientes,
        cantidad: pizza.cantidad
      }))
    };

    return this.http.post<RespuestaPedido>(
      `${this.apiUrl}/pedidos`,
      datos
    ).pipe(
      tap(respuesta => {
        if (respuesta.exito) {
          this.limpiarPedido();
          this.pedidoFinalizadoSubject.next();
        }
      })
    );
  }

  consultarPedidos(): Observable<{
    exito: boolean;
    pedidos: Venta[];
  }> {
    return this.http.get<{
      exito: boolean;
      pedidos: Venta[];
    }>(`${this.apiUrl}/pedidos`);
  }

  consultarVentasDia(dia: string): Observable<RespuestaVentas> {
    return this.http.get<RespuestaVentas>(
      `${this.apiUrl}/ventas/dia`,
      { params: { dia } }
    );
  }

  consultarVentasMes(
    mes: string,
    anio: number
  ): Observable<RespuestaVentas> {
    return this.http.get<RespuestaVentas>(
      `${this.apiUrl}/ventas/mes`,
      {
        params: {
          mes,
          anio: String(anio)
        }
      }
    );
  }

  consultarResumen(): Observable<{
    exito: boolean;
    cantidad_ventas: number;
    total_acumulado: number;
  }> {
    return this.http.get<{
      exito: boolean;
      cantidad_ventas: number;
      total_acumulado: number;
    }>(`${this.apiUrl}/ventas/resumen`);
  }

  obtenerDetallePedido(id: number): Observable<{
    exito: boolean;
    pedido: PedidoGuardado;
  }> {
    return this.http.get<{
      exito: boolean;
      pedido: PedidoGuardado;
    }>(`${this.apiUrl}/pedidos/${id}`);
  }
}
