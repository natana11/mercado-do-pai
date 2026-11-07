// Regras do app, sem tela: quem é mais barato, listas por mercado, ofertas. Roda no navegador e no node (testes).
(function (raiz) {
  const ORDEM = ["combo", "fatima"];
  const r2 = (n) => Math.round(n * 100) / 100;

  function melhorMercado(item) {
    const ms = ORDEM.filter((m) => item.precos[m]).sort((a, b) => item.precos[a].por - item.precos[b].por || ORDEM.indexOf(a) - ORDEM.indexOf(b));
    const mercado = ms[0], outro = ms[1] || null;
    const preco = item.precos[mercado].por, precoOutro = outro ? item.precos[outro].por : null;
    return { mercado, preco, outro, precoOutro, economia: outro ? r2(precoOutro - preco) : 0 };
  }

  function montarListas(dados) {
    const l = {}; ORDEM.forEach((m) => (l[m] = []));
    for (const i of dados.itens) if (i.na_lista !== false) l[melhorMercado(i).mercado].push(i);
    for (const m of ORDEM) l[m].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    return l;
  }

  function descontoDe(i) {
    const m = melhorMercado(i).mercado, p = i.precos[m];
    return p.de ? r2(p.de - p.por) / p.de : 0;
  }

  // Dado que chega da internet só entra se tiver o formato certo (senão a tela ficaria em branco).
  function valido(d) {
    return !!d && typeof d.atualizado === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.atualizado) && !!d.mercados &&
      ORDEM.every((m) => d.mercados[m] && typeof d.mercados[m].nome === "string") && Array.isArray(d.itens) && d.itens.length > 0 &&
      d.itens.every((i) => i && typeof i.id === "string" && typeof i.nome === "string" && i.precos &&
        Object.keys(i.precos).length > 0 && Object.entries(i.precos).every(([m, p]) => ORDEM.includes(m) && p && typeof p.por === "number" && p.por > 0));
  }

  function ofertas(dados, max = 6) {
    return dados.itens.filter((i) => i.na_lista !== false && descontoDe(i) > 0).sort((a, b) => descontoDe(b) - descontoDe(a)).slice(0, max);
  }

  const reais = (n) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dataCurta = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

  const api = { ORDEM, valido, melhorMercado, montarListas, ofertas, descontoDe, reais, dataCurta };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else raiz.Logica = api;
})(this);
