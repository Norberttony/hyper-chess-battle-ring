
// Code courtesy of
// https://github.com/raklaptudirm/arbiter/tree/master/pkg/eve/stats

export function pentaSPRT(lls, lds, dds, wds, wws, elo0, elo1, alpha, beta){
    // total number of game pairs
    const N = lls + lds + dds + wds + wws + 2.5;

    // probabilities for each possibility
    const ll = (lls + 0.5) / N;
    const ld = (lds + 0.5) / N;
    const dd = (dds + 0.5) / N;
    const wd = (wds + 0.5) / N;
    const ww = (wws + 0.5) / N;

    // empirical mean
    const mu = ww + 0.75 * wd + 0.5 * dd + 0.25 * ld;

    // standard deviation
    const r = Math.sqrt(getVariance(ww, wd, dd, ld, ll, mu));

    // convert elo bounds to score
    const mu0 = nEloToScore(elo0, r);
    const mu1 = nEloToScore(elo1, r);

    // deviation to the score bounds
    const r0 = getVariance(ww, wd, dd, ld, ll, mu0);
    const r1 = getVariance(ww, wd, dd, ld, ll, mu1);

    if (r0 == 0 || r1 == 0)
        return 0;

    // the log-likelihood ratio
    // the referenced code mentions that this is a very close approximation and mentions this paper:
    // http://hardy.uhasselt.be/Fishtest/support_MLE_multinomial.pdf
	const ratio = 0.5 * N * Math.log(r0 / r1);
    console.log(ratio);

    const l_a = Math.log(beta / (1 - alpha));
    const l_b = Math.log((1 - beta) / alpha);
    if (ratio > l_b)
        return "H1";
    else if (ratio < l_a)
        return "H0";
    else
        return undefined;
}

function getVariance(ww, wd, dd, ld, ll, mu){
    return Math.sqrt(
        ww * (1.00 - mu) ** 2 +
        wd * (0.75 - mu) ** 2 +
        dd * (0.50 - mu) ** 2 +
        ld * (0.25 - mu) ** 2 +
        ll * (0.00 - mu) ** 2
    );
}

function nEloToScore(nelo, r){
	return nelo * Math.SQRT2 * r / (800 / Math.LN10) + 0.5;
}
