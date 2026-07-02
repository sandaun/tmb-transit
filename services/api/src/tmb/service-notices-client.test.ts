import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseServiceNoticesHtml } from './service-notices-client';

describe('parseServiceNoticesHtml', () => {
  it('maps featured and list service notices to alert DTOs', () => {
    const alerts = parseServiceNoticesHtml(
      `
        <li class="events-v2__item" data-type="t-9" data-start="1783296000000 " data-end="1788048000000" data-title="l4" data-starting="true">
          <a href="/es/-/avis-tancament-l4-verdaguer">
            <h2 class="events-v2__card-title">L4: Estaci&oacute;n Verdaguer fuera de servicio</h2>
            <div class="events-v2__card-date">Desde el 06/07/2026 al 30/08/2026</div>
            <p class="events-v2__card-description">Estaci&oacute;n Verdaguer (L4) cerrada</p>
          </a>
        </li>
        <li class="list__item" data-type="t-1" data-start="1751673600000" data-end="1751846400000" data-title="d20, h8, l2">
          <a href="/es/-/avis-afectacio-tour-france">
            <h2 class="event-unit__title">Afectaciones por la salida del Tour de France</h2>
            <p class="event-unit__date">Del 05/07/2026 al 06/07/2026</p>
            <p class="event-unit__description">Desv&iacute;os en bus y metro.</p>
          </a>
        </li>
      `,
      'https://www.tmb.cat/es/transporte-barcelona/avisos-servicio',
    );

    assert.equal(alerts.length, 2);
    assert.equal(alerts[0].id, 'tmb:avis-tancament-l4-verdaguer');
    assert.equal(alerts[0].title, 'L4: Estación Verdaguer fuera de servicio');
    assert.equal(alerts[0].mode, 'metro');
    assert.equal(alerts[0].severity, 'disruption');
    assert.equal(alerts[0].kind, 'planned');
    assert.deepEqual(alerts[0].affectedLines, [{ mode: 'metro', code: 'L4' }]);
    assert.equal(alerts[0].sourceUrl, 'https://www.tmb.cat/es/-/avis-tancament-l4-verdaguer');
    assert.equal(alerts[0].startsAtMs, 1_783_296_000_000);

    assert.equal(alerts[1].mode, 'mixed');
    assert.deepEqual(alerts[1].affectedLines, [
      { mode: 'bus', code: 'D20' },
      { mode: 'bus', code: 'H8' },
      { mode: 'metro', code: 'L2' },
    ]);
  });
});
