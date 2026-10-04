declare module 'glicko2' {
  interface GlickoPlayer {
    getRating(): number;
    getRd(): number;
    getVol(): number;
  }

  class Glicko2 {
    constructor(options: { tau: number; rating: number; rd: number; vol: number });
    makePlayer(rating: number, rd: number, vol: number): GlickoPlayer;
    updateRatings(matches: Array<[GlickoPlayer, GlickoPlayer, number]>): void;
  }

  const glicko2: { Glicko2: typeof Glicko2 };
  export default glicko2;
}