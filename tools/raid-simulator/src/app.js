/*
 * Interface du simulateur de raid du centre de recherche.
 *
 * Aucun calcul de combat ici : tout passe par RaidSimCore (raidSimCore.js),
 * le seul module verrouille par le test de parite avec le moteur du bot.
 * Ce fichier ne fait que collecter la saisie et mettre en forme la sortie.
 */

const TYPE_LABELS = {
  normal: "Normal",
  water: "Eau",
  fire: "Feu",
  grass: "Plante",
  electric: "Électrik",
  bug: "Insecte",
  poison: "Poison",
  flying: "Vol",
  fighting: "Combat",
  rock: "Roche",
  ground: "Sol",
  psychic: "Psy",
  ghost: "Spectre",
  dark: "Ténèbres",
  ice: "Glace",
  steel: "Acier",
  dragon: "Dragon",
  fairy: "Fée",
};

const STAT_LABELS = {
  hp: "PV",
  attack: "Attaque",
  specialAttack: "Attaque Spé.",
  defense: "Défense",
  specialDefense: "Défense Spé.",
  speed: "Vitesse",
};

/** Meme libelle, precede du possessif correct : "sa Defense", "son Attaque". */
const STAT_POSSESSIVE = {
  hp: "ses PV",
  attack: "son Attaque",
  specialAttack: "son Attaque Spé.",
  defense: "sa Défense",
  specialDefense: "sa Défense Spé.",
  speed: "sa Vitesse",
};

const { ALL_STAT_KEYS, STAT_MATCHUPS, multiplyStats, computeBattle } = window.RaidSimCore;

const POKEDEX_URL = "pokedex.json";

const state = {
  pokedex: new Map(),
  boss: {
    pokemon: null,
    difficulty: 3,
    attackType: null,
  },
  defenders: [],
  detailVisible: false,
};

let defenderIdCounter = 0;

/** Echappement systematique : les noms viennent d'un JSON, jamais en HTML brut. */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function typeLabel(type) {
  return TYPE_LABELS[type] || type || "—";
}

async function loadPokedex() {
  const response = await fetch(POKEDEX_URL, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Pokédex indisponible (HTTP ${response.status})`);
  }
  const entries = await response.json();
  for (const pokemon of entries) {
    state.pokedex.set(pokemon.id, pokemon);
  }
}

function populateDatalist() {
  const datalist = document.getElementById("pokemon-datalist");
  const fragment = document.createDocumentFragment();
  const sorted = [...state.pokedex.values()].sort((a, b) => a.id - b.id);
  for (const pokemon of sorted) {
    const option = document.createElement("option");
    option.value = `${pokemon.name} #${pokemon.id}`;
    fragment.appendChild(option);
  }
  datalist.appendChild(fragment);
}

/**
 * Le datalist propose "Nom #id" : l'id est la seule cle fiable (homonymes,
 * accents, casse). Une saisie libre sans id ne resout rien, volontairement.
 */
function resolvePokemonFromSearchValue(value) {
  const match = /#(\d+)\s*$/.exec(value.trim());
  if (match) {
    return state.pokedex.get(Number(match[1])) || null;
  }

  // Repli : nom exact saisi a la main, sans ambiguite dans le pokedex.
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const matches = [...state.pokedex.values()].filter(
    (pokemon) => pokemon.name.toLowerCase() === normalized,
  );
  return matches.length === 1 ? matches[0] : null;
}

function typeBadges(types) {
  return types
    .map((type) => `<span class="type-badge">${escapeHtml(typeLabel(type))}</span>`)
    .join("");
}

function renderPokemonCard(container, pokemon) {
  if (!pokemon) {
    container.classList.add("empty");
    container.textContent = "Aucune créature analysée.";
    return;
  }
  container.classList.remove("empty");
  container.innerHTML = `
    <img src="${escapeHtml(pokemon.image)}" alt="" loading="lazy" />
    <div>
      <div class="name">${escapeHtml(pokemon.name)}</div>
      <div class="types">${typeBadges(pokemon.types)}</div>
    </div>
  `;
}

function populateTypeSelect(select, types, selectedType) {
  select.innerHTML = "";
  if (!types || types.length === 0) {
    select.disabled = true;
    return;
  }
  select.disabled = false;
  for (const type of types) {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = typeLabel(type);
    if (type === selectedType) {
      option.selected = true;
    }
    select.appendChild(option);
  }
}

// --- Cablage de la creature ---

const bossSearchInput = document.getElementById("boss-search");
const bossDifficultyInput = document.getElementById("boss-difficulty");
const bossAttackTypeSelect = document.getElementById("boss-attack-type");
const bossCard = document.getElementById("boss-card");

bossSearchInput.addEventListener("input", () => {
  const pokemon = resolvePokemonFromSearchValue(bossSearchInput.value);
  state.boss.pokemon = pokemon;
  state.boss.attackType = pokemon ? pokemon.types[0] : null;
  renderPokemonCard(bossCard, pokemon);
  populateTypeSelect(bossAttackTypeSelect, pokemon ? pokemon.types : [], state.boss.attackType);
  render();
});

bossDifficultyInput.addEventListener("input", () => {
  const value = Number(bossDifficultyInput.value);
  state.boss.difficulty = Number.isFinite(value) && value > 0 ? value : 1;
  render();
});

bossAttackTypeSelect.addEventListener("change", () => {
  state.boss.attackType = bossAttackTypeSelect.value;
  render();
});

// --- Cablage des defenseurs ---

const defendersList = document.getElementById("defenders-list");
const defenderRowTemplate = document.getElementById("defender-row-template");
const addDefenderButton = document.getElementById("add-defender");

function addDefenderRow() {
  const id = defenderIdCounter++;
  const defenderState = { id, pokemon: null, attackType: null };
  state.defenders.push(defenderState);

  const node = defenderRowTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.defenderId = String(id);

  const searchInput = node.querySelector(".defender-search");
  const attackTypeSelect = node.querySelector(".defender-attack-type");
  const removeButton = node.querySelector(".btn-remove");

  searchInput.addEventListener("input", () => {
    const pokemon = resolvePokemonFromSearchValue(searchInput.value);
    defenderState.pokemon = pokemon;
    defenderState.attackType = pokemon ? pokemon.types[0] : null;
    populateTypeSelect(attackTypeSelect, pokemon ? pokemon.types : [], defenderState.attackType);
    render();
  });

  attackTypeSelect.addEventListener("change", () => {
    defenderState.attackType = attackTypeSelect.value;
    render();
  });

  removeButton.addEventListener("click", () => {
    state.defenders = state.defenders.filter((defender) => defender.id !== id);
    node.remove();
    render();
  });

  defendersList.appendChild(node);
  return searchInput;
}

addDefenderButton.addEventListener("click", () => {
  const input = addDefenderRow();
  input.focus();
});

// --- Projection ---

function buildSimulationInput() {
  const boss = state.boss.pokemon;
  if (!boss) {
    return null;
  }

  const finalStats = multiplyStats(boss.stats, state.boss.difficulty);
  const defenders = state.defenders
    .filter((defender) => defender.pokemon)
    .map((defender) => ({
      name: defender.pokemon.name,
      attackType: defender.attackType,
      stats: defender.pokemon.stats,
      defenseEffectiveness: defender.pokemon.effectiveness.defense,
    }));

  return {
    boss: {
      finalStats,
      attackType: state.boss.attackType,
      defenseEffectiveness: boss.effectiveness.defense,
    },
    defenders,
  };
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return "∞";
  }
  return Math.round(value * 100) / 100;
}

function formatSigned(value) {
  if (!Number.isFinite(value)) {
    return value > 0 ? "+∞" : "−∞";
  }
  const rounded = formatNumber(value);
  return value > 0 ? `+${rounded}` : String(rounded);
}

function renderStatsTable(result, bossStats) {
  const rows = ALL_STAT_KEYS.map((key) => {
    const opposing = STAT_MATCHUPS[key];
    const isDecisive = key !== "hp";

    // Les PV ne decident de rien : on affiche l'ecart, mais en neutre, pour
    // ne pas laisser croire qu'un deficit de PV fait perdre le raid.
    const diff = isDecisive
      ? result.statDiffs[key]
      : result.teamStats.hp - bossStats.hp;
    const diffClass = !isDecisive ? "diff-neutral" : diff > 0 ? "diff-positive" : "diff-negative";

    const opposingHint =
      opposing === key
        ? ""
        : ` <span class="meta-line-inline">(${STAT_POSSESSIVE[opposing]})</span>`;

    const label = isDecisive
      ? STAT_LABELS[key]
      : `${STAT_LABELS[key]} <span class="meta-line-inline">(indicatif)</span>`;

    return `
      <tr class="${isDecisive ? "" : "row-info"}">
        <td>${label}</td>
        <td>${formatNumber(bossStats[opposing])}${opposingHint}</td>
        <td>${formatNumber(result.teamStats[key])}</td>
        <td class="${diffClass}">${formatSigned(diff)}</td>
      </tr>
    `;
  }).join("");

  return `
    <div class="table-scroll">
      <table class="stats-table">
        <thead>
          <tr>
            <th>Axe de l'équipe</th>
            <th>Créature (stat affrontée)</th>
            <th>Votre équipe</th>
            <th>Écart</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function formatCalculation(line, description) {
  if (!line.op) {
    return `${formatNumber(line.base)} <span class="meta-line-inline">(aucun modificateur)</span>`;
  }
  return `${formatNumber(line.base)} ${line.op} ${formatNumber(line.multiplier)} <span class="meta-line-inline">(${escapeHtml(description)})</span>`;
}

function renderDetailBreakdown(result, boss, difficulty) {
  const bossRows = ALL_STAT_KEYS.map((key) => {
    const base = boss.pokemon.stats[key];
    return `
      <tr>
        <td>${STAT_LABELS[key]}</td>
        <td>${formatNumber(base)} × ${formatNumber(difficulty)} <span class="meta-line-inline">(niveau de menace)</span></td>
        <td>${formatNumber(base * difficulty)}</td>
      </tr>
    `;
  }).join("");

  const bossAttackLabel = typeLabel(state.boss.attackType);

  const defendersHtml = result.contributions
    .map((contribution) => {
      const attackLabel = typeLabel(contribution.defender.attackType);
      const rows = ALL_STAT_KEYS.map((key) => {
        const line = contribution.lines[key];
        let description = "";
        if (key === "attack" || key === "specialAttack") {
          description = `efficacité d'une attaque ${attackLabel} sur la créature`;
        } else if (key === "defense" || key === "specialDefense") {
          description = `efficacité de l'attaque ${bossAttackLabel} de la créature sur lui`;
        }
        return `
          <tr>
            <td>${STAT_LABELS[key]}</td>
            <td>${formatCalculation(line, description)}</td>
            <td>${formatNumber(line.result)}</td>
          </tr>
        `;
      }).join("");

      return `
        <div class="defender-detail">
          <h4>${escapeHtml(contribution.defender.name)} <span class="meta-line-inline">(attaque ${escapeHtml(attackLabel)})</span></h4>
          <div class="table-scroll">
            <table class="stats-table detail-table">
              <thead>
                <tr><th>Statistique</th><th>Calcul</th><th>Apport</th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="detail-breakdown">
      <h3>Stats de la créature (menace ${formatNumber(difficulty)})</h3>
      <div class="table-scroll">
        <table class="stats-table detail-table">
          <thead>
            <tr><th>Statistique</th><th>Calcul</th><th>Résultat</th></tr>
          </thead>
          <tbody>${bossRows}</tbody>
        </table>
      </div>
      <h3>Apport de chaque défenseur</h3>
      ${defendersHtml}
    </div>
  `;
}

function renderVerdictExplanation(result) {
  if (result.success) {
    return `<p class="verdict-explain">L'équipe dépasse la créature sur les cinq axes décisifs. <strong>Dans cette configuration, le raid est remporté.</strong></p>`;
  }

  const missingLabels = result.missingStats.map((key) => STAT_LABELS[key]);
  const listing = missingLabels.join(", ");
  const axisPhrase = missingLabels.length > 1 ? "ces axes" : "cet axe";
  return `
    <p class="verdict-explain">
      Il manque de la marge sur <strong>${escapeHtml(listing)}</strong>.
      Un axe à égalité compte comme insuffisant : il faut <strong>dépasser</strong> la créature.
      Renforcez ${axisPhrase} — un défenseur de plus, ou un type d'attaque plus efficace contre elle.
    </p>
  `;
}

/**
 * Un defenseur insensible au type d'attaque de la creature divise ses
 * defenses par 0 : le bot lui donne des defenses infinies, et le simulateur
 * doit afficher la meme chose. Sans un mot d'explication, le joueur croit a
 * un bug d'affichage.
 */
function renderInfinityNote(result) {
  const hasInfinite = Object.values(result.teamStats).some((value) => !Number.isFinite(value));
  if (!hasInfinite) {
    return "";
  }
  return `
    <p class="verdict-explain">
      Un de vos défenseurs est <strong>insensible</strong> au type d'attaque de la créature :
      elle ne peut rien lui faire, ses défenses comptent donc comme infinies. Le combat réel
      se comporte exactement pareil.
    </p>
  `;
}

function render() {
  const resultsContent = document.getElementById("results-content");
  const input = buildSimulationInput();

  if (!input) {
    resultsContent.innerHTML = `<p class="hint">Renseignez une créature et au moins un défenseur pour lancer la projection.</p>`;
    return;
  }

  if (input.defenders.length === 0) {
    resultsContent.innerHTML = `<p class="hint">Ajoutez au moins un défenseur avec un Pokémon sélectionné.</p>`;
    return;
  }

  const result = computeBattle(input.boss, input.defenders);
  const verdictClass = result.success ? "success" : "fail";
  const verdictLabel = result.success ? "RAID REMPORTÉ" : "RAID PERDU";

  resultsContent.innerHTML = `
    <div class="results-header">
      <span class="verdict ${verdictClass}">${verdictLabel}</span>
      <button type="button" class="btn-secondary btn-detail" id="toggle-detail">
        ${state.detailVisible ? "Masquer le calcul" : "Voir le calcul"}
      </button>
    </div>
    ${renderVerdictExplanation(result)}
    ${renderInfinityNote(result)}
    <p class="meta-line">Défenseurs pris en compte : ${result.participantsCount}</p>
    ${renderStatsTable(result, input.boss.finalStats)}
    ${state.detailVisible ? renderDetailBreakdown(result, state.boss, state.boss.difficulty) : ""}
  `;

  document.getElementById("toggle-detail").addEventListener("click", () => {
    state.detailVisible = !state.detailVisible;
    render();
  });
}

async function init() {
  try {
    await loadPokedex();
  } catch (error) {
    document.getElementById("results-content").innerHTML =
      `<p class="hint">Le pokédex n'a pas pu être chargé (${escapeHtml(error.message)}). Rechargez la page dans un instant.</p>`;
    return;
  }
  populateDatalist();
  addDefenderRow();
  render();
}

init();
