/* Calculadora de juros compostos
   - simular(): cálculo puro, um ponto por ano
   - desenharGrafico(): gráfico SVG de duas linhas
   - o resto liga o formulário à tela */

const LIMITES = { anos: [1, 60], taxa: [0, 1000], valor: [0, 1e12] };

function numero(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function limitar(n, [min, max]) {
  return Math.min(max, Math.max(min, n));
}

/**
 * @param {{inicial:number, aporte:number, degraus?:{ano:number, valor:number}[], taxa:number, tipoTaxa:'ano'|'mes', anos:number}} entrada
 * @returns {{ano:number, investido:number, total:number, juros:number}[]} do ano 0 ao ano N
 */
function simular(entrada) {
  const inicial = limitar(numero(entrada.inicial), LIMITES.valor);
  const aporte = limitar(numero(entrada.aporte), LIMITES.valor);
  // "Depois de N anos, o aporte passa a ser V". Vale a partir do ano N + 1.
  const degraus = (entrada.degraus || [])
    .map((d) => ({ ano: Math.floor(numero(d.ano)), valor: limitar(numero(d.valor), LIMITES.valor) }))
    .filter((d) => d.ano >= 1)
    .sort((a, b) => a.ano - b.ano);
  const taxa = limitar(numero(entrada.taxa), LIMITES.taxa) / 100;
  const anos = Math.round(limitar(numero(entrada.anos), LIMITES.anos));

  // Taxa mensal efetiva: 10% ao ano não vira 10/12% ao mês.
  const i = entrada.tipoTaxa === 'mes' ? taxa : Math.pow(1 + taxa, 1 / 12) - 1;

  const pontos = [{ ano: 0, investido: inicial, total: inicial, juros: 0 }];
  let saldo = inicial;
  let investido = inicial;
  for (let mes = 1; mes <= anos * 12; mes++) {
    const anosCompletos = Math.floor((mes - 1) / 12);
    let aporteDoMes = aporte;
    for (const d of degraus) if (d.ano <= anosCompletos) aporteDoMes = d.valor;
    saldo = saldo * (1 + i) + aporteDoMes; // aporte no fim do mês
    investido += aporteDoMes;
    if (mes % 12 === 0) {
      pontos.push({ ano: mes / 12, investido, total: saldo, juros: saldo - investido });
    }
  }
  return pontos;
}

if (typeof module !== 'undefined') module.exports = { simular };

/* ---------- Tela ---------- */

if (typeof document !== 'undefined') {
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const num = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
  const $ = (id) => document.getElementById(id);

  const campos = {
    inicial: $('inicial'),
    aporte: $('aporte'),
    taxa: $('taxa'),
    tipoTaxa: $('tipoTaxa'),
    anos: $('anos'),
  };

  const grafico = $('grafico');
  const dica = $('dica');
  // As medidas do gráfico seguem a largura da tela: no celular o desenho
  // é menor, então textos e marcadores mantêm o tamanho real.
  let W = 720, H = 380, PW = 0, PH = 0;
  const M = { t: 16, r: 20, b: 40, l: 82 };
  function medir() {
    W = Math.round(grafico.parentElement.clientWidth) || 720;
    const estreito = W < 520;
    H = estreito ? Math.max(240, Math.round(W * 0.8)) : Math.min(380, Math.round(W * 0.53));
    M.l = estreito ? 66 : 82;
    M.r = estreito ? 14 : 20;
    PW = W - M.l - M.r;
    PH = H - M.t - M.b;
    grafico.setAttribute('viewBox', `0 0 ${W} ${H}`);
  }

  let pontos = [];
  let escala = null;
  let ativo = null;

  function compacto(v) {
    if (v >= 1e6) return `R$ ${num.format(v / 1e6)} mi`;
    if (v >= 1e3) return `R$ ${num.format(v / 1e3)} mil`;
    return `R$ ${num.format(v)}`;
  }

  // Passo "redondo" para o eixo Y (1, 2, 2,5, 5 × 10^n), com ~4 divisões.
  function passoY(max) {
    if (max <= 0) return 1;
    const bruto = max / 4;
    const p = Math.pow(10, Math.floor(Math.log10(bruto)));
    return [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= bruto);
  }

  function passoX(anos) {
    return [1, 2, 5, 10].find((s) => anos / s <= 10);
  }

  function desenharGrafico() {
    medir();
    const anos = pontos.length - 1;
    const maximo = pontos[anos].total;
    const passo = passoY(maximo);
    const yMax = Math.max(passo, Math.ceil(maximo / passo) * passo);
    const x = (ano) => M.l + (ano / anos) * PW;
    const y = (v) => M.t + PH - (v / yMax) * PH;
    escala = { anos, x, y };

    const linha = (campo) =>
      pontos.map((p, k) => `${k ? 'L' : 'M'}${x(p.ano).toFixed(1)},${y(p[campo]).toFixed(1)}`).join('');
    const area =
      linha('total') +
      pontos.slice().reverse().map((p) => `L${x(p.ano).toFixed(1)},${y(p.investido).toFixed(1)}`).join('') +
      'Z';

    let svg = '';
    for (let v = 0; v <= yMax + passo / 2; v += passo) {
      svg += `<line class="grade" x1="${M.l}" x2="${W - M.r}" y1="${y(v)}" y2="${y(v)}"/>`;
      svg += `<text class="eixo" x="${M.l - 10}" y="${y(v) + 4}" text-anchor="end">${compacto(v)}</text>`;
    }
    const px = passoX(anos);
    for (let a = 0; a <= anos; a += px) {
      svg += `<text class="eixo" x="${x(a)}" y="${H - M.b + 22}" text-anchor="middle">${a}</text>`;
    }
    svg += `<text class="eixo" x="${M.l + PW / 2}" y="${H - 4}" text-anchor="middle">anos</text>`;

    svg += `<path class="area" d="${area}"/>`;
    svg += `<path class="linha investido" d="${linha('investido')}"/>`;
    svg += `<path class="linha total" d="${linha('total')}"/>`;

    if (anos <= 30) {
      for (const p of pontos) {
        svg += `<circle class="marca investido" cx="${x(p.ano)}" cy="${y(p.investido)}" r="3.5"/>`;
        svg += `<circle class="marca total" cx="${x(p.ano)}" cy="${y(p.total)}" r="3.5"/>`;
      }
    }

    svg += `<g id="foco" hidden>
      <line class="mira" id="mira" y1="${M.t}" y2="${M.t + PH}"/>
      <circle class="marca investido foco" id="foco-inv" r="5.5"/>
      <circle class="marca total foco" id="foco-tot" r="5.5"/>
    </g>`;

    grafico.innerHTML = svg;
    const f = pontos[anos];
    grafico.setAttribute(
      'aria-label',
      `Gráfico de ${anos} ${anos === 1 ? 'ano' : 'anos'}: você investe ${brl.format(f.investido)} e chega a ${brl.format(f.total)}, com ${brl.format(f.juros)} de juros.`
    );
    ativo = null;
    dica.hidden = true;
  }

  function mostrar(indice) {
    if (!escala) return;
    ativo = Math.max(0, Math.min(escala.anos, indice));
    const p = pontos[ativo];
    const cx = escala.x(p.ano);
    $('foco').removeAttribute('hidden');
    $('mira').setAttribute('x1', cx);
    $('mira').setAttribute('x2', cx);
    $('foco-inv').setAttribute('cx', cx);
    $('foco-inv').setAttribute('cy', escala.y(p.investido));
    $('foco-tot').setAttribute('cx', cx);
    $('foco-tot').setAttribute('cy', escala.y(p.total));

    dica.innerHTML = `<strong>${p.ano === 0 ? 'Início' : `Ano ${p.ano}`}</strong>
      <span class="l"><i class="chave investido"></i>Investido</span><span>${brl.format(p.investido)}</span>
      <span class="l"><i class="chave total"></i>Acumulado</span><span>${brl.format(p.total)}</span>
      <span class="l">Juros</span><span>${brl.format(p.juros)}</span>`;
    dica.hidden = false;

    const caixa = grafico.getBoundingClientRect();
    const esq = (cx / W) * caixa.width;
    const topo = (escala.y(p.total) / H) * caixa.height;
    dica.style.left = `${esq}px`;
    dica.style.top = `${topo}px`;
    dica.classList.toggle('esquerda', esq > caixa.width * 0.6);
  }

  function esconder() {
    ativo = null;
    dica.hidden = true;
    const foco = $('foco');
    if (foco) foco.setAttribute('hidden', '');
  }

  function indiceDoPonteiro(e) {
    const caixa = grafico.getBoundingClientRect();
    const vx = ((e.clientX - caixa.left) / caixa.width) * W;
    return Math.round(((vx - M.l) / PW) * escala.anos);
  }

  grafico.addEventListener('pointermove', (e) => mostrar(indiceDoPonteiro(e)));
  grafico.addEventListener('pointerleave', (e) => {
    // No toque, o dedo sai do gráfico ao levantar: mantém a dica até tocar fora.
    if (e.pointerType !== 'touch' && document.activeElement !== grafico) esconder();
  });
  document.addEventListener('pointerdown', (e) => {
    if (!grafico.parentElement.contains(e.target)) esconder();
  });
  grafico.addEventListener('focus', () => mostrar(ativo ?? escala.anos));
  grafico.addEventListener('blur', esconder);
  grafico.addEventListener('keydown', (e) => {
    const passos = { ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in passos) mostrar((ativo ?? escala.anos) + passos[e.key]);
    else if (e.key === 'Home') mostrar(0);
    else if (e.key === 'End') mostrar(escala.anos);
    else return;
    e.preventDefault();
  });

  const listaDegraus = $('degraus');

  function lerDegraus() {
    return [...listaDegraus.querySelectorAll('.degrau')].map((linha) => ({
      ano: linha.querySelector('.d-ano').value,
      valor: linha.querySelector('.d-valor').value,
    }));
  }

  function adicionarDegrau() {
    const atuais = lerDegraus();
    const ultimo = atuais[atuais.length - 1];
    const ano = ultimo ? Math.min(59, Math.floor(numero(ultimo.ano)) + 5) : 5;
    const valor = ultimo ? ultimo.valor : campos.aporte.value;
    const linha = document.createElement('div');
    linha.className = 'degrau';
    linha.innerHTML = `
      <div class="entrada"><input class="d-ano" type="number" inputmode="numeric" min="1" max="59" step="1" value="${ano}" aria-label="Depois de quantos anos o aporte muda"></div>
      <div class="entrada"><b>R$</b><input class="d-valor" type="number" inputmode="decimal" min="0" step="any" value="${valor}" aria-label="Novo aporte mensal"></div>
      <button type="button" class="remover" aria-label="Remover esta mudança">&times;</button>`;
    listaDegraus.appendChild(linha);
  }

  $('add-degrau').addEventListener('click', () => {
    adicionarDegrau();
    atualizar();
    listaDegraus.lastElementChild.querySelector('.d-ano').focus();
  });
  listaDegraus.addEventListener('input', atualizar);
  listaDegraus.addEventListener('click', (e) => {
    const botao = e.target.closest('.remover');
    if (!botao) return;
    botao.closest('.degrau').remove();
    atualizar();
  });

  function atualizar() {
    $('degraus-cab').hidden = !listaDegraus.children.length;
    const entrada = {
      inicial: campos.inicial.value,
      aporte: campos.aporte.value,
      degraus: lerDegraus(),
      taxa: campos.taxa.value,
      tipoTaxa: campos.tipoTaxa.value,
      anos: campos.anos.value,
    };
    pontos = simular(entrada);
    const f = pontos[pontos.length - 1];

    $('r-investido').textContent = brl.format(f.investido);
    $('r-juros').textContent = brl.format(f.juros);
    $('r-total').textContent = brl.format(f.total);
    $('r-detalhe').textContent =
      f.investido > 0 ? `Seu dinheiro rendeu ${num.format((f.juros / f.investido) * 100)}% sobre o que você investiu.` : '';

    $('tabela-corpo').innerHTML = pontos
      .map(
        (p) =>
          `<tr><th scope="row">${p.ano}</th><td>${brl.format(p.investido)}</td><td>${brl.format(p.juros)}</td><td>${brl.format(p.total)}</td></tr>`
      )
      .join('');

    desenharGrafico();
  }

  let larguraAnterior = grafico.parentElement.clientWidth;
  new ResizeObserver(() => {
    const largura = grafico.parentElement.clientWidth;
    if (largura !== larguraAnterior) {
      larguraAnterior = largura;
      desenharGrafico();
    }
  }).observe(grafico.parentElement);

  for (const c of Object.values(campos)) c.addEventListener('input', atualizar);
  atualizar();
}
