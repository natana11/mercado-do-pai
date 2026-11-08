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


  // ---- v2: lista do pai (ordem de prateleira), ofertas do dia e comparação entre mercados ----
  const semAcento = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const slug = (t) => semAcento(t).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const idOferta = (o) => "of:" + o.mercado + ":" + slug(o.produto);

  function listaPadrao(d) { return d.itens.filter((i) => i.na_lista !== false).map((i) => i.id); }

  const SECAO_POR_PALAVRA = [["acougue", /carne|frango|linguica|sobrecoxa|coxa|file|bovin|suin|patinho|paleta|musculo/],
    ["hortifruti", /banana|batata kg|manga|uva|morango|tomate|cebola|alface|fruta|verdura/], ["padaria", /pao|rosca|bolo/],
    ["frios", /leite|queijo|iogurte|margarina|presunto|ovos|requeijao|manteiga/], ["bebidas", /cerveja|refri|suco|agua|energetico|vinho/],
    ["limpeza", /papel|sabao|detergente|amaciante|desinfetante|esponja/], ["higiene", /sabonete|shampoo|creme dental|desodorante/],
    ["mercearia", /arroz|feijao|cafe|acucar|oleo|macarrao|farinha|molho|biscoito|sal\b/]];
  function secaoDe(texto) { const t = semAcento(texto); const s = SECAO_POR_PALAVRA.find(([, re]) => re.test(t)); return s ? s[0] : "outros"; }

  function validas(o, hoje) { return (o && Array.isArray(o.ofertas) ? o.ofertas : []).filter((x) => !x.valido_ate || x.valido_ate >= hoje); }

  function itemDaLista(id, d, of, hoje, extras) {
    if (id.startsWith("livre:")) return { id, nome: id.slice(6), secao: "outros", mercado: null, preco: null, livre: true };
    if (id.startsWith("of:")) {
      const o = validas(of, hoje).find((x) => idOferta(x) === id) || (of && of.ofertas || []).find((x) => idOferta(x) === id);
      if (!o) {   // folheto venceu: o item fica na lista do pai com o que ele viu, avisando que a oferta acabou
        const g = extras && extras[id]; if (!g) return null;
        return { id, nome: g.nome, secao: g.secao || "outros", mercado: g.mercado, preco: g.preco, oferta: true, acabou: true };
      }
      return { id, nome: o.produto, secao: secaoDe(o.tipo || o.produto), mercado: o.mercado, preco: o.preco, oferta: true };
    }
    const i = d.itens.find((x) => x.id === id); if (!i) return null;
    const m = melhorMercado(i);
    return { id, nome: i.nome, icone: i.icone, secao: i.secao || "outros", mercado: m.mercado, preco: m.preco, outro: m.outro, precoOutro: m.precoOutro };
  }

  // Agrupa por mercado e, dentro dele, pela ordem das prateleiras. Marcar como pego NÃO muda a posição.
  function montarLista(d, ids, pegos, of, hoje, extras) {
    const ordemSec = (d.secoes || []).map((s) => s.id), nomeSec = {}; (d.secoes || []).forEach((s) => (nomeSec[s.id] = s.nome));
    const posCat = {}; d.itens.forEach((x, k) => (posCat[x.id] = k));
    const r = { livres: [] }; ORDEM.forEach((m) => (r[m] = []));
    const itens = ids.map((id, k) => { const it = itemDaLista(id, d, of, hoje, extras); if (it) { it.pego = (pegos || []).includes(id); it.k = posCat[id] ?? 1000 + k; } return it; }).filter(Boolean);
    for (const it of itens) if (it.livre) r.livres.push(it);
    for (const m of ORDEM) {
      const doM = itens.filter((it) => it.mercado === m);
      const secs = [...new Set(doM.map((it) => it.secao))].sort((a, b) => (ordemSec.indexOf(a) + 1 || 99) - (ordemSec.indexOf(b) + 1 || 99));
      r[m] = secs.map((s) => ({ secao: s, nome: nomeSec[s] || "Outros", itens: doM.filter((it) => it.secao === s).sort((a, b) => a.k - b.k) }));
    }
    return r;
  }

  function ofertasValidas(o, hoje) { const r = {}; ORDEM.forEach((m) => (r[m] = validas(o, hoje).filter((x) => x.mercado === m))); return r; }

  // Mesma coisa no outro mercado: primeiro a oferta do dia de lá, senão o preço que temos do catálogo.
  function compararOferta(of, todas, d, hoje) {
    if (!of || !of.tipo) return null;
    const outro = ORDEM.find((m) => m !== of.mercado);
    const daLa = validas({ ofertas: todas }, hoje).filter((x) => x.mercado === outro && x.tipo === of.tipo).sort((a, b) => a.preco - b.preco)[0];
    let preco = null, fonte = null, nome = null;
    if (daLa) { preco = daLa.preco; fonte = "oferta"; nome = daLa.produto; }
    else { const i = d.itens.find((x) => x.tipo === of.tipo && x.precos[outro]); if (i) { preco = i.precos[outro].por; fonte = "catalogo"; nome = i.nome; } }
    if (preco == null) return null;
    return { mercado: outro, preco, fonte, nome, maisBarato: of.preco < preco, diferenca: r2(Math.abs(preco - of.preco)) };
  }

  function validarOfertas(o) {
    return !!o && typeof o.atualizado === "string" && Array.isArray(o.ofertas) &&
      o.ofertas.every((x) => x && ORDEM.includes(x.mercado) && typeof x.produto === "string" && x.produto && typeof x.preco === "number" && x.preco > 0);
  }

  const reais = (n) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dataCurta = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

  const api = { ORDEM, valido, melhorMercado, montarListas, ofertas, descontoDe, reais, dataCurta,
    listaPadrao, montarLista, itemDaLista, ofertasValidas, compararOferta, validarOfertas, idOferta, secaoDe, slug };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else raiz.Logica = api;
})(this);
