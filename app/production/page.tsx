import { ProductionSimulator } from '@/components/production/ProductionSimulator';

export const metadata = {
  title: 'ББК · Производство — Барабан-Буфер-Канат',
  description: 'Симулятор управления производственными заказами по методике ББК с буфером времени и приоритизацией',
};

export default function ProductionPage() {
  return (
    <main>
      <ProductionSimulator />
    </main>
  );
}
