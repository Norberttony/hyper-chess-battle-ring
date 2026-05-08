
// Code courtesy of
// https://github.com/raklaptudirm/arbiter/tree/master/pkg/eve/stats

// represents the frequency of each possible two-game result.
export interface Pentamonial {
    ll: number,
    ld: number,
    dd: number,
    wd: number,
    ww: number
}

export function pentaSPRT(
    { ll, ld, dd, wd, ww }: Pentamonial,
    elo0: number,
    elo1: number
): number {
    // total number of game pairs
    const N = ll + ld + dd + wd + ww + 2.5;

    // probabilities for each possibility
    const llp = (ll + 0.5) / N;
    const ldp = (ld + 0.5) / N;
    const ddp = (dd + 0.5) / N;
    const wdp = (wd + 0.5) / N;
    const wwp = (ww + 0.5) / N;

    // empirical mean
    const mu = wwp + 0.75 * wdp + 0.5 * ddp + 0.25 * ldp;

    // standard deviation
    const r = Math.sqrt(getVariance(wwp, wdp, ddp, ldp, llp, mu));

    // convert elo bounds to score
    const mu0 = nEloToScore(elo0, r);
    const mu1 = nEloToScore(elo1, r);

    // deviation to the score bounds
    const r0 = getVariance(wwp, wdp, ddp, ldp, llp, mu0);
    const r1 = getVariance(wwp, wdp, ddp, ldp, llp, mu1);

    if (r0 == 0 || r1 == 0)
        return 0;

    // the log-likelihood ratio
    // the referenced code mentions that this is a very close approximation and mentions this paper:
    // http://hardy.uhasselt.be/Fishtest/support_MLE_multinomial.pdf
	return 0.5 * N * Math.log(r0 / r1);
}

function getVariance(
    ww: number,
    wd: number,
    dd: number,
    ld: number,
    ll: number,
    mu: number
): number {
    return Math.sqrt(
        ww * (1.00 - mu) ** 2 +
        wd * (0.75 - mu) ** 2 +
        dd * (0.50 - mu) ** 2 +
        ld * (0.25 - mu) ** 2 +
        ll * (0.00 - mu) ** 2
    );
}

function nEloToScore(nelo: number, r: number): number {
	return nelo * Math.SQRT2 * r / (800 / Math.LN10) + 0.5;
}
