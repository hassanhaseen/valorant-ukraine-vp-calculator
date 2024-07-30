const packages = {
    "420 VP": 80,
    "880 VP": 160,
    "1825 VP": 320,
    "3225 VP": 560,
    "4650 VP": 800,
    "9650 VP": 1600
};

async function getConversionRate() {
    const url = "https://v6.exchangerate-api.com/v6/98abee6d3286a3235da5b798/pair/UAH/PKR";
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.conversion_rate;
    } catch (error) {
        alert(`Failed to fetch conversion rate: ${error}`);
        return null;
    }
}

function calculateUkrainianRegionPrices(uahToPkrRate) {
    const results = {};
    for (const [vp, uah] of Object.entries(packages)) {
        const totalCost = uah * uahToPkrRate * 1.058;
        const costPerVp = totalCost / parseInt(vp.split(' ')[0]);
        results[vp] = {
            totalCost: totalCost.toFixed(2),
            costPerVp: costPerVp.toFixed(2)
        };
    }
    return results;
}

function displayPrices(prices) {
    const pricesDiv = document.getElementById('prices');
    pricesDiv.innerHTML = '';
    for (const [vp, details] of Object.entries(prices)) {
        pricesDiv.innerHTML += `<p>${vp}: Total Cost = ${details.totalCost} PKR, Cost per VP = ${details.costPerVp} PKR/VP</p>`;
    }
}

async function calculatePrices() {
    const conversionRate = await getConversionRate();
    if (conversionRate) {
        const prices = calculateUkrainianRegionPrices(conversionRate);
        displayPrices(prices);
    }
}

function findBestAndSecondBestOptions(vpNeeded, prices) {
    const sortedPackages = Object.keys(packages).map(k => [k, parseInt(k.split(' ')[0])]).sort((a, b) => b[1] - a[1]);

    function calculateCostAndVp(selectedPacks) {
        let totalCost = 0;
        let totalVp = 0;
        for (const [packName, packVp] of selectedPacks) {
            totalVp += packVp;
            totalCost += parseFloat(prices[packName].totalCost);
        }
        return { totalCost, totalVp };
    }

    let bestOption = { packs: [], totalCost: Infinity, totalVp: 0 };
    let secondBestOption = { packs: [], totalCost: Infinity, totalVp: 0 };

    for (let i = 0; i < sortedPackages.length; i++) {
        let selectedPacks = [];
        let remainingVp = vpNeeded;

        for (const [packName, packVp] of sortedPackages.slice(i)) {
            while (packVp <= remainingVp) {
                selectedPacks.push([packName, packVp]);
                remainingVp -= packVp;
            }
        }

        if (remainingVp > 0) {
            const [smallestPack, smallestPackVp] = sortedPackages[sortedPackages.length - 1];
            const numSmallestPacks = Math.ceil(remainingVp / smallestPackVp);
            for (let j = 0; j < numSmallestPacks; j++) {
                selectedPacks.push([smallestPack, smallestPackVp]);
            }
        }

        const { totalCost, totalVp } = calculateCostAndVp(selectedPacks);
        if (totalCost < bestOption.totalCost) {
            secondBestOption = bestOption;
            bestOption = { packs: selectedPacks, totalCost, totalVp };
        } else if (totalCost < secondBestOption.totalCost && totalCost !== bestOption.totalCost) {
            secondBestOption = { packs: selectedPacks, totalCost, totalVp };
        }
    }

    for (const [packName, packVp] of sortedPackages) {
        if (!bestOption.packs.some(pack => pack[0] === packName)) {
            let selectedPacks = [[packName, packVp]];
            let remainingVp = vpNeeded - packVp;

            for (const [nextPackName, nextPackVp] of sortedPackages) {
                while (nextPackVp <= remainingVp) {
                    selectedPacks.push([nextPackName, nextPackVp]);
                    remainingVp -= nextPackVp;
                }
            }

            if (remainingVp > 0) {
                const [smallestPack, smallestPackVp] = sortedPackages[sortedPackages.length - 1];
                const numSmallestPacks = Math.ceil(remainingVp / smallestPackVp);
                for (let j = 0; j < numSmallestPacks; j++) {
                    selectedPacks.push([smallestPack, smallestPackVp]);
                }
            }

            const { totalCost, totalVp } = calculateCostAndVp(selectedPacks);
            if (totalCost < secondBestOption.totalCost) {
                secondBestOption = { packs: selectedPacks, totalCost, totalVp };
            }
        }
    }

    return { bestOption, secondBestOption };
}

function displayRecommendations(vpNeeded, bestOption, secondBestOption) {
    const recommendationsDiv = document.getElementById('recommendations');
    recommendationsDiv.innerHTML = `<h2>Recommendations for ${vpNeeded} VP</h2>`;

    recommendationsDiv.innerHTML += '<h3>Best Option:</h3>';
    if (bestOption.packs.length > 0) {
        const packSummary = bestOption.packs.reduce((summary, [packName]) => {
            summary[packName] = (summary[packName] || 0) + 1;
            return summary;
        }, {});
        for (const [packName, numPacks] of Object.entries(packSummary)) {
            recommendationsDiv.innerHTML += `<p>${packName}: ${numPacks} pack(s)</p>`;
        }
        recommendationsDiv.innerHTML += `<p>Total VP: ${bestOption.totalVp}</p>`;
        recommendationsDiv.innerHTML += `<p>Total Cost: ${bestOption.totalCost.toFixed(2)} PKR</p>`;
    } else {
        recommendationsDiv.innerHTML += '<p>No packs available.</p>';
    }

    recommendationsDiv.innerHTML += '<h3>Second Best Option (with larger pack):</h3>';
    if (secondBestOption.packs.length > 0) {
        const packSummary = secondBestOption.packs.reduce((summary, [packName]) => {
            summary[packName] = (summary[packName] || 0) + 1;
            return summary;
        }, {});
        for (const [packName, numPacks] of Object.entries(packSummary)) {
            recommendationsDiv.innerHTML += `<p>${packName}: ${numPacks} pack(s)</p>`;
        }
        recommendationsDiv.innerHTML += `<p>Total VP: ${secondBestOption.totalVp}</p>`;
        recommendationsDiv.innerHTML += `<p>Total Cost: ${secondBestOption.totalCost.toFixed(2)} PKR</p>`;
    } else {
        recommendationsDiv.innerHTML += '<p>No alternative packs available.</p>';
    }
}

async function recommendPacks() {
    const vpNeeded = parseInt(document.getElementById('vp_needed').value);
    if (isNaN(vpNeeded) || vpNeeded <= 0) {
        alert('Invalid VP amount. Please enter a positive integer.');
        return;
    }
    const conversionRate = await getConversionRate();
    if (conversionRate) {
        const prices = calculateUkrainianRegionPrices(conversionRate);
        const { bestOption, secondBestOption } = findBestAndSecondBestOptions(vpNeeded, prices);
        displayRecommendations(vpNeeded, bestOption, secondBestOption);
    }
}
