# Calculadora de juros compostos

Simule quanto o seu dinheiro cresce com juros compostos. O gráfico tem duas linhas, com um ponto por ano:

- **Total investido**: o que saiu do seu bolso (valor inicial + aportes).
- **Total acumulado**: investido + juros. O espaço entre as linhas é o lucro.

HTML, CSS e JavaScript puro, sem dependências. Abra o `index.html` no navegador.

## Como usar

Preencha valor inicial, aporte mensal, mudanças no aporte ao longo do tempo (ex.: depois de 10 anos, passa a ser R$ 2.000), taxa de juros (ao ano ou ao mês) e período em anos (1 a 60). Tudo atualiza enquanto você digita. A tabela ano a ano fica logo abaixo do gráfico.

## Como o cálculo funciona

- Taxa ao ano vira taxa mensal equivalente: `i = (1 + taxa)^(1/12) − 1`. Taxa ao mês é usada como está.
- A cada mês: `saldo = saldo × (1 + i) + aporte`. O aporte entra no fim do mês. Cada mudança vale depois de N anos completos: com "depois de 10 anos, R$ 2.000", o aporte novo começa no ano 11.
- O gráfico mostra o saldo no fim de cada ano.

## Publicar no GitHub Pages

Em **Settings → Pages**, escolha a branch `main` e a pasta raiz.

## Licença

MIT. Veja [LICENSE](LICENSE).
