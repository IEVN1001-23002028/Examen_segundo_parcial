
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PedidoService, Pizza } from '../../services/pedido';

@Component({
  selector: 'app-pedido',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './pedido.html',
  styleUrl: './pedido.css'
})
export class Pedido implements OnInit {

  mensaje = '';
  error = '';

  formulario;

  constructor(
    private fb: FormBuilder,
    private pedidoService: PedidoService
  ) {
    this.formulario = this.fb.nonNullable.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      direccion: ['', [Validators.required, Validators.maxLength(255)]],
      telefono: ['', [Validators.required, Validators.maxLength(20)]],
      fecha_pedido: [this.obtenerFecha(), Validators.required],
      tamano: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
      jamon: [false],
      pina: [false],
      champinones: [false]
    });
  }

  ngOnInit(): void {
    this.pedidoService.pedidoFinalizado$.subscribe(() => {
      this.formulario.reset({
        nombre: '',
        direccion: '',
        telefono: '',
        fecha_pedido: this.obtenerFecha(),
        tamano: '',
        cantidad: 1,
        jamon: false,
        pina: false,
        champinones: false
      });

      this.mensaje = '';
      this.error = '';
    });
  }

  obtenerFecha(): string {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  agregarPizza(): void {
    this.mensaje = '';
    this.error = '';

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.error = 'Completa correctamente todos los campos';
      return;
    }

    const datos = this.formulario.getRawValue();

    if (!datos.nombre.trim() || !datos.direccion.trim() || !datos.telefono.trim()) {
      this.error = 'Los datos del cliente son obligatorios';
      return;
    }

    const precios: Record<string, number> = {
      Chica: 40,
      Mediana: 80,
      Grande: 120
    };

    const precioPizza = precios[datos.tamano];

    if (precioPizza === undefined) {
      this.error = 'Selecciona un tamaño válido';
      return;
    }

    const ingredientes: string[] = [];

    if (datos.jamon) ingredientes.push('Jamón');
    if (datos.pina) ingredientes.push('Piña');
    if (datos.champinones) ingredientes.push('Champiñones');

    const subtotal = (
      precioPizza + ingredientes.length * 10
    ) * datos.cantidad;

    const pizza: Pizza = {
      tamano: datos.tamano,
      ingredientes,
      cantidad: datos.cantidad,
      subtotal
    };

    this.pedidoService.establecerCliente({
      nombre: datos.nombre.trim(),
      direccion: datos.direccion.trim(),
      telefono: datos.telefono.trim(),
      fecha_pedido: datos.fecha_pedido
    });

    this.pedidoService.agregarPizza(pizza);

    this.mensaje = 'Pizza agregada correctamente';

    this.formulario.patchValue({
      tamano: '',
      cantidad: 1,
      jamon: false,
      pina: false,
      champinones: false
    });
  }
}