import { Player } from '../../types/Player';
//Ajouter le pokemon rencontré au pokedex du joueur

export function addToPokedex(player: Player | null, pokemonId: number): void {
        if (!player) {
                console.error('❌ Player null dans addToPokedex');
                return;
        }
        player.randomCaptures.push(pokemonId);
        console.log(`Pokémon ${pokemonId} ajouté à ${player.name}`);
}