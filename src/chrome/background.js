chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {

  if (changeInfo.status === "complete") {
    const url = tab.url;
    const selector = getSelector(url);

    if (!selector) return;

    const { githubToken } = await chrome.storage.sync.get("githubToken");

    if (!githubToken) {
      await showAlertBadge();
      return
    }

    const response = await fetch(`https://api.github.com/user`, {
      headers: { Authorization: `Bearer ${githubToken}` },
    });

    if (response.status !== 200) {
      await showAlertBadge();
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: inject,
      args: [selector, githubToken]
    });
  }
});


async function showAlertBadge() {
  await chrome.action.setBadgeText({ text: '!' });
  await chrome.action.setBadgeTextColor({ color: 'white' });
  await chrome.action.setBadgeBackgroundColor({ color: 'red' });
}

function getSelector(url) {
  const selectors = [
    {
      pattern: /https?:\/\/github.com\/[^\/]+\/[^\/]+\/*$/,
      selector: "#readme",
    },
    {
      pattern: /https?:\/\/github.com\/.*\/[Rr][Ee][Aa][Dd][Mm][Ee]\.md$/i,
      selector: "article",
    },
    {
      pattern: /https?:\/\/github.com\/[^\/]+\/[^\/]+\/(issues|pull)\/\d+\/*$/,
      selector: ".comment-body",
    },
    {
      pattern: /https?:\/\/github.com\/[^\/]+\/[^\/]+\/wiki\/*$/,
      selector: "#wiki-body",
    },
  ];

  const selector = selectors.find(({ pattern }) => pattern.test(url))?.selector;
  return selector;
}

async function inject(selector, githubToken) {

  const allLinks = document.querySelectorAll(`${selector} a`);
  const injectPromises = [];

  allLinks.forEach((link) => {
    if (isGitHubRepo(link.href) && !link.querySelector('strong#github-stars-14151312')) {
      injectPromises.push(injectStars(link));
    }
  });

  await Promise.all(injectPromises);

  const uls = Array.from(document.querySelectorAll(`${selector} ul`)).filter(ul => ul.querySelectorAll(':scope > li').length >= 2);

  if (!uls) return;

  for (const ul of uls) {
    sortLis(ul);
  }

  function sortLis(ul) {
    const lis = Array.from(ul.querySelectorAll(":scope > li"));

    lis.sort((a, b) => {
      const aStars = getHighestStars(a);
      const bStars = getHighestStars(b);

      return bStars - aStars;
    });

    for (const li of lis) {
      ul.appendChild(li);
    }
  }


  function getHighestStars(liElement) {
    const clonedLiElement = liElement.cloneNode(true);

    const ulElements = clonedLiElement.querySelectorAll("ul");
    for (const ulElement of ulElements) {
      ulElement.remove();
    }

    const starsElements = clonedLiElement.querySelectorAll("strong#github-stars-14151312");
    let highestStars = 0;

    for (const starsElement of starsElements) {
      const stars = parseInt(starsElement.getAttribute("stars"));
      if (stars > highestStars) {
        highestStars = stars;
      }
    }

    return highestStars;
  }

  async function injectStars(link) {
    const stars = await getStars(link.href);    
    if (!stars) return;

    const strong = document.createElement("strong");
    strong.id = "github-stars-14151312";
    strong.setAttribute("stars", stars);
    strong.style.color = "#fff";
    strong.style.fontSize = "12px";
    strong.innerText = `★ ${roundNumber(stars)}`;
    strong.style.backgroundColor = "#093812";
    strong.style.paddingRight = "5px";
    strong.style.paddingLeft = "5px";
    strong.style.textAlign = "center";
    strong.style.paddingBottom = "1px";
    strong.style.borderRadius = "5px";
    strong.style.marginLeft = "5px";
    link.appendChild(strong);
  }

  function isGitHubRepo(url) {
    const githubRegex = /^https:\/\/github\.com\/[^/]+\/[^/#]+$/;
    return githubRegex.test(url);
  }

  async function getStars(githubRepoURL) {
    const repoName = githubRepoURL.match(/github\.com\/([^/]+\/[^/]+)/)[1];

    const response = await fetch(`https://api.github.com/repos/${repoName}`, {
      headers: { Authorization: `Token ${githubToken}` },
    });

    const data = await response.json();
    const stars = data.stargazers_count;

    return stars;
  }

  function roundNumber(number) {
    if (number < 1000) return number;

    const suffixes = ['', 'k', 'M', 'B', 'T'];

    const suffixIndex = Math.floor(Math.log10(number) / 3);
    const scaledNumber = number / Math.pow(10, suffixIndex * 3);

    const formattedNumber = scaledNumber % 1 === 0 ? scaledNumber.toFixed(0) : scaledNumber.toFixed(1);

    return `${formattedNumber}${suffixes[suffixIndex]}`;
  }

}