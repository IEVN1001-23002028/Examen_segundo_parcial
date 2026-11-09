
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  PedidoService,
  Venta,
  PedidoGuardado
} from '../../services/pedido';

@Component({
  selector: 'app-ventas-dia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ventas-dia.html',
  styleUrl: './ventas-dia.css'
})
export class VentasDia implements OnInit, OnDestroy {

  tipoConsulta = 'dia';

  dias = [
    'domingo',
    'lunes',
    'martes',
    'miercoles',
    'jueves',
    'viernes',
    'sabado'
  ];

  meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre'
  ];

  dia = '';
  mes = '';
  anio = 2026;

  ventas: Venta[] = [];
  cantidadVentas = 0;
  totalAcumulado = 0;

  detalleSeleccionado: PedidoGuardado | null = null;

  cargando = false;
  cargandoDetalle = false;
  error = '';

  private suscripcion?: Subscription;
  private consultaActual?: Subscription;
  private detalleActual?: Subscription;

  constructor(
    private pedidoService: PedidoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const fecha = new Date();

    this.dia = this.dias[fecha.getDay()];
    this.mes = this.meses[fecha.getMonth()];
    this.anio = fecha.getFullYear();

    this.consultarVentas();

    this.suscripcion = this.pedidoService.pedidoFinalizado$
      .subscribe(() => {
        this.consultarVentas();
      });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    this.consultaActual?.unsubscribe();
    this.detalleActual?.unsubscribe();
  }

  consultarVentas(): void {
    this.consultaActual?.unsubscribe();

    this.error = '';
    this.cargando = true;
    this.detalleSeleccionado = null;

    const consulta = this.tipoConsulta === 'dia'
      ? this.pedidoService.consultarVentasDia(this.dia)
      : this.pedidoService.consultarVentasMes(this.mes, this.anio);

    this.consultaActual = consulta.subscribe({
      next: respuesta => {
        this.ventas = respuesta.ventas || [];
        this.cantidadVentas = respuesta.cantidad_ventas;
        this.totalAcumulado = respuesta.total_acumulado;
        this.cargando = false;

        this.cdr.markForCheck();
      },
      error: error => {
        this.ventas = [];
        this.cantidadVentas = 0;
        this.totalAcumulado = 0;
        this.cargando = false;

        this.error = error.error?.mensaje ||
          'No se pudieron consultar las ventas';

        this.cdr.markForCheck();
      }
    });
  }

  cambiarTipoConsulta(): void {
    this.consultarVentas();
  }

  verDetalle(id: number): void {
    this.detalleActual?.unsubscribe();

    this.error = '';
    this.cargandoDetalle = true;
    this.detalleSeleccionado = null;

    this.detalleActual = this.pedidoService
      .obtenerDetallePedido(id)
      .subscribe({
        next: respuesta => {
          this.detalleSeleccionado = respuesta.pedido;
          this.cargandoDetalle = false;

          this.cdr.markForCheck();
        },
        error: error => {
          this.cargandoDetalle = false;

          this.error = error.error?.mensaje ||
            'No se pudo consultar el detalle del pedido';

          this.cdr.markForCheck();
        }
      });
  }

  cerrarDetalle(): void {
    this.detalleActual?.unsubscribe();
    this.detalleSeleccionado = null;
    this.cargandoDetalle = false;
  }

}