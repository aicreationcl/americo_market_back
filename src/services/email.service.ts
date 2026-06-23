import { Resend } from 'resend'
import { config } from '../config'
import type { IOrder } from '../models/Order'

const formatCLP = (amount: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)

const STATUS_LABELS: Record<string, string> = {
  payment_confirmed: 'Pago confirmado',
  preparing: 'Preparando tu pedido',
  ready_for_pickup: 'Listo para retiro',
  in_transit: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const STATUS_MESSAGES: Record<string, string> = {
  payment_confirmed: 'Hemos confirmado tu pago. Estamos procesando tu pedido.',
  preparing: 'Estamos preparando tu pedido con todo el cuidado.',
  ready_for_pickup: 'Tu pedido está listo. Puedes pasar a retirarlo por la tienda.',
  in_transit: 'Tu pedido está en camino. ¡Pronto llegará a tu puerta!',
  delivered: 'Tu pedido fue entregado. ¡Gracias por comprar en AMERICO!',
  cancelled: 'Tu pedido ha sido cancelado. Si tienes dudas, contáctanos.',
}

const NOTIFIABLE_STATUSES = new Set([
  'payment_confirmed',
  'preparing',
  'ready_for_pickup',
  'in_transit',
  'delivered',
  'cancelled',
])

const baseStyle = `
  font-family: 'Segoe UI', Arial, sans-serif;
  background: #fafaf9;
  margin: 0;
  padding: 0;
`

const cardStyle = `
  max-width: 560px;
  margin: 32px auto;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
`

const headerHtml = `
  <div style="background: #d97706; padding: 24px 32px;">
    <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700; letter-spacing:-0.3px;">AMERICO Minimarket</h1>
  </div>
`

const footerHtml = `
  <div style="padding: 20px 32px; background: #f5f5f4; border-top: 1px solid #e7e5e4;">
    <p style="margin:0; color:#a8a29e; font-size:12px;">
      AMERICO Minimarket · Si tienes dudas responde este correo o visítanos en tienda.
    </p>
  </div>
`

const itemsTableHtml = (order: IOrder) => `
  <table style="width:100%; border-collapse:collapse; margin:16px 0;">
    <thead>
      <tr style="border-bottom: 1px solid #e7e5e4;">
        <th style="text-align:left; padding:6px 0; font-size:12px; color:#78716c; font-weight:600;">Producto</th>
        <th style="text-align:center; padding:6px 0; font-size:12px; color:#78716c; font-weight:600;">Cant.</th>
        <th style="text-align:right; padding:6px 0; font-size:12px; color:#78716c; font-weight:600;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${order.items.map((item) => `
        <tr style="border-bottom: 1px solid #f5f5f4;">
          <td style="padding:8px 0; font-size:14px; color:#292524;">${item.name}</td>
          <td style="padding:8px 0; font-size:14px; color:#78716c; text-align:center;">×${item.quantity}</td>
          <td style="padding:8px 0; font-size:14px; color:#292524; text-align:right;">${formatCLP(item.subtotal)}</td>
        </tr>
      `).join('')}
    </tbody>
    <tfoot>
      ${order.shippingCost > 0 ? `
        <tr>
          <td colspan="2" style="padding:8px 0; font-size:13px; color:#78716c;">Envío</td>
          <td style="padding:8px 0; font-size:13px; text-align:right; color:#78716c;">${formatCLP(order.shippingCost)}</td>
        </tr>
      ` : ''}
      <tr>
        <td colspan="2" style="padding:10px 0 0; font-size:15px; font-weight:700; color:#292524;">Total</td>
        <td style="padding:10px 0 0; font-size:15px; font-weight:700; text-align:right; color:#292524;">${formatCLP(order.total)}</td>
      </tr>
    </tfoot>
  </table>
`

const buildConfirmationEmail = (order: IOrder): string => {
  const isPickup = order.fulfillment.type === 'pickup'
  return `
    <body style="${baseStyle}">
      <div style="${cardStyle}">
        ${headerHtml}
        <div style="padding: 28px 32px;">
          <p style="margin:0 0 4px; font-size:14px; color:#78716c;">¡Hola, ${order.customer.name}!</p>
          <h2 style="margin:0 0 20px; font-size:20px; color:#292524; font-weight:700;">Tu pedido fue recibido</h2>
          <div style="background:#fef3c7; border-radius:8px; padding:14px 16px; margin-bottom:20px;">
            <p style="margin:0; font-size:13px; color:#92400e;">
              <strong>Número de pedido:</strong> ${order.orderNumber}
            </p>
          </div>
          ${itemsTableHtml(order)}
          <div style="background:#f5f5f4; border-radius:8px; padding:14px 16px; margin-top:16px;">
            <p style="margin:0 0 6px; font-size:13px; color:#78716c; font-weight:600;">
              ${isPickup ? 'RETIRO EN TIENDA' : 'ENVÍO A DOMICILIO'}
            </p>
            ${isPickup
              ? `<p style="margin:0; font-size:13px; color:#292524;">Te avisaremos cuando tu pedido esté listo para retirar.</p>`
              : `<p style="margin:0; font-size:13px; color:#292524;">
                  ${order.fulfillment.address?.street ?? ''} ${order.fulfillment.address?.number ?? ''},
                  ${order.fulfillment.address?.commune ?? ''}
                </p>`
            }
          </div>
          <p style="margin:20px 0 0; font-size:13px; color:#78716c;">
            Puedes seguir el estado de tu pedido en:
            <a href="${process.env.FRONTEND_URL ?? 'https://americomarketfront-production.up.railway.app'}/pedido/${order.orderNumber}"
               style="color:#d97706; text-decoration:none; font-weight:600;">${order.orderNumber}</a>
          </p>
        </div>
        ${footerHtml}
      </div>
    </body>
  `
}

const buildStatusUpdateEmail = (order: IOrder): string => {
  const label = STATUS_LABELS[order.status] ?? order.status
  const message = STATUS_MESSAGES[order.status] ?? ''
  return `
    <body style="${baseStyle}">
      <div style="${cardStyle}">
        ${headerHtml}
        <div style="padding: 28px 32px;">
          <p style="margin:0 0 4px; font-size:14px; color:#78716c;">¡Hola, ${order.customer.name}!</p>
          <h2 style="margin:0 0 12px; font-size:20px; color:#292524; font-weight:700;">${label}</h2>
          <p style="margin:0 0 20px; font-size:14px; color:#57534e;">${message}</p>
          <div style="background:#fef3c7; border-radius:8px; padding:14px 16px;">
            <p style="margin:0; font-size:13px; color:#92400e;">
              <strong>Pedido:</strong> ${order.orderNumber} · <strong>Total:</strong> ${formatCLP(order.total)}
            </p>
          </div>
          <p style="margin:20px 0 0; font-size:13px; color:#78716c;">
            Ver estado completo:
            <a href="${process.env.FRONTEND_URL ?? 'https://americomarketfront-production.up.railway.app'}/pedido/${order.orderNumber}"
               style="color:#d97706; text-decoration:none; font-weight:600;">${order.orderNumber}</a>
          </p>
        </div>
        ${footerHtml}
      </div>
    </body>
  `
}

const buildNewOrderNotificationEmail = (order: IOrder): string => `
  <body style="${baseStyle}">
    <div style="${cardStyle}">
      ${headerHtml}
      <div style="padding: 28px 32px;">
        <h2 style="margin:0 0 16px; font-size:18px; color:#292524;">Nuevo pedido recibido</h2>
        <p style="margin:0 0 4px; font-size:14px; color:#57534e;"><strong>Cliente:</strong> ${order.customer.name} (${order.customer.email})</p>
        <p style="margin:0 0 16px; font-size:14px; color:#57534e;"><strong>Número:</strong> ${order.orderNumber}</p>
        ${itemsTableHtml(order)}
        <p style="margin:16px 0 0; font-size:13px; color:#78716c;">
          Entrega: ${order.fulfillment.type === 'pickup' ? 'Retiro en tienda' : `Envío a ${order.fulfillment.address?.commune ?? '—'}`}
        </p>
      </div>
      ${footerHtml}
    </div>
  </body>
`

const getResendClient = (): Resend | null => {
  if (!config.RESEND_API_KEY) return null
  return new Resend(config.RESEND_API_KEY)
}

export const sendOrderConfirmation = async (order: IOrder): Promise<void> => {
  const resend = getResendClient()
  if (!resend) return

  await resend.emails.send({
    from: config.FROM_EMAIL!,
    to: order.customer.email,
    subject: `Pedido recibido ${order.orderNumber} — AMERICO Minimarket`,
    html: buildConfirmationEmail(order),
  })
}

export const sendOrderStatusUpdate = async (order: IOrder): Promise<void> => {
  if (!NOTIFIABLE_STATUSES.has(order.status)) return

  const resend = getResendClient()
  if (!resend) return

  await resend.emails.send({
    from: config.FROM_EMAIL!,
    to: order.customer.email,
    subject: `${STATUS_LABELS[order.status] ?? 'Actualización'} — Pedido ${order.orderNumber}`,
    html: buildStatusUpdateEmail(order),
  })
}

export const sendNewOrderNotification = async (order: IOrder): Promise<void> => {
  if (!config.ADMIN_EMAIL) return

  const resend = getResendClient()
  if (!resend) return

  await resend.emails.send({
    from: config.FROM_EMAIL!,
    to: config.ADMIN_EMAIL,
    subject: `Nuevo pedido ${order.orderNumber} — ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(order.total)}`,
    html: buildNewOrderNotificationEmail(order),
  })
}
