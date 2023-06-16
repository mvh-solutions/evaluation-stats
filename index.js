const path = require('path');
const fse = require('fs-extra');

const usage = "node evaluation-stats.js <inDir>";

if (process.argv.length !== 3) {
    console.log(`Wrong number of command line arguments\n${usage}`);
    process.exit(1);
}

const inDir = path.resolve(process.argv[2]);
console.log(`# Reading from ${inDir}`);
let evaluations = [];
for (const inFile of fse.readdirSync(inDir)) {
    evaluations.push(fse.readJsonSync(path.join(inDir, inFile)));
}
console.log(`${evaluations.length} evaluation(s) read`);
console.log();
console.log(`# Rated Better (simple count)`);
console.log();
let betters = {
    sense: {},
    style: {},
    level: {},
    all: {},
};
// evaluations = evaluations.filter(e => !e.translations.includes("DeepL"));
for (const evaluation of evaluations) {
    for (const metric of ['sense', 'style', 'level']) {
        if (evaluation.best[metric] === 'SAME') {
            continue;
        }
        if (!betters[metric][evaluation.best[metric]]) {
            betters[metric][evaluation.best[metric]] = 0;
        }
        betters[metric][evaluation.best[metric]]++;
        if (!betters["all"][evaluation.best[metric]]) {
            betters["all"][evaluation.best[metric]] = 0;
        }
        betters["all"][evaluation.best[metric]]++;
    }
}
for (const metric of ['sense', 'style', 'level', 'all']) {
    console.log(`## ${metric}`);
    console.log();
    for (const [metricKey, metricValue] of Object.entries(betters[metric]).sort((a, b) => b[1] - a[1])) {
        console.log(`- ${metricKey}: ${metricValue}`);
        console.log();
    }
}
console.log(`# Pair comparisons (win/tie/lose)`);
console.log();
for (const translator of Object.keys(betters['all'])) {
    console.log(`## ${translator}`);
    console.log();
    const pairComparisons = {};
    for (const evaluation of evaluations) {
        if (!evaluation.translations.includes(translator)) {
            continue;
        }
        const otherTranslation = evaluation.translations.filter(t => t !== translator)[0];
        if (!pairComparisons[otherTranslation]) {
            pairComparisons[otherTranslation] = {};
        }
        for (const metric of ['sense', 'style', 'level', 'all']) {
            if (!pairComparisons[otherTranslation][metric]) {
                pairComparisons[otherTranslation][metric] = {
                    win: 0,
                    lose: 0,
                    tie: 0,
                }
            }
        }
        for (const metric of ['sense', 'style', 'level']) {
            switch (evaluation.best[metric]) {
                case "SAME":
                    pairComparisons[otherTranslation][metric]['tie']++;
                    break;
                case translator:
                    pairComparisons[otherTranslation][metric]['win']++;
                    break;
                default:
                    pairComparisons[otherTranslation][metric]['lose']++;
            }
        }
    }
    for (const otherTranslator of Object.keys(betters['all']).filter(t => t !== translator)) {
        for (const metric of ['sense', 'style', 'level']) {
            for (const score of ['win', 'tie', 'lose']) {
                if (!pairComparisons[otherTranslator]) {
                    continue;
                }
                pairComparisons[otherTranslator]['all'][score] += pairComparisons[otherTranslator][metric][score];
            }
        }
    }
    for (const [otherTranslation, otherTranslationStats] of Object.entries(pairComparisons)) {
        console.log(`### vs ${otherTranslation}: (${otherTranslationStats['sense']['win']+otherTranslationStats['sense']['tie']+otherTranslationStats['sense']['lose']})`);
        console.log();
        for (const metric of ['sense', 'style', 'level', 'all']) {
            console.log(`- ${metric} - ${otherTranslationStats[metric]['win']}/${otherTranslationStats[metric]['tie']}/${otherTranslationStats[metric]['lose']}`)
            console.log();
        }
        console.log();
    }
}
