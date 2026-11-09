
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PedidoService, Pizza } from '../../services/pedido';

@Component({
  selector: 'app-detalle-pedido',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-pedido.html',
  styleUrl: './detalle-pedido.css'
})
export class DetallePedido implements OnInit, OnDestroy {

  pizzas: Pizza[] = [];
  seleccionado: number | null = null;
  guardando = false;
  mensaje = '';
  error = '';

  private suscripcion?: Subscription;

  constructor(
  private pedidoService: PedidoService,
  private cdr: ChangeDetectorRef
) {}

ngOnInit(): void {
  this.suscripcion = this.pedidoService.pizzas$.subscribe(pizzas => {
    this.pizzas = [...pizzas];
    this.seleccionado = null;

    this.cdr.markForCheck();

    console.log('Pizzas recibidas en detalle:', this.pizzas);
  });
}

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  get total(): number {
    return this.pedidoService.calcularTotal();
  }

  seleccionarPizza(index: number): void {
    this.seleccionado = index;
  }

  quitarPizza(): void {
    this.error = '';
    this.mensaje = '';

    if (this.seleccionado === null) {
      this.error = 'Selecciona una pizza para quitarla';
      return;
    }

    this.pedidoService.eliminarPizza(this.seleccionado);
    this.mensaje = 'Pizza eliminada correctamente';
  }

  terminarPedido(): void {
    this.error = '';
    this.mensaje = '';

    if (this.guardando) return;

    if (this.pizzas.length === 0) {
      this.error = 'Debes agregar al menos una pizza';
      return;
    }

    this.guardando = true;

    try {
      this.pedidoService.terminarPedido().subscribe({
        next: respuesta => {
          this.guardando = false;
          this.mensaje = `Pedido #${respuesta.id_pedido} registrado. Total a pagar: $${respuesta.total.toFixed(2)}`;
        },
        error: error => {
          this.guardando = false;
          this.error = error.error?.mensaje || 'No se pudo guardar el pedido';
        }
      });
    } catch (error) {
      this.guardando = false;
      this.error = error instanceof Error
        ? error.message
        : 'Ocurrió un error al registrar el pedido';
    }
  }
}