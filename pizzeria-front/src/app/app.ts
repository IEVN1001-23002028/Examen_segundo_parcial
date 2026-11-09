import { Component } from '@angular/core';

import { Pedido } from './components/pedido/pedido';
import { DetallePedido } from './components/detalle-pedido/detalle-pedido';
import { VentasDia } from './components/ventas-dia/ventas-dia';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    Pedido,
    DetallePedido,
    VentasDia
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

}