const tokenInput = document.getElementById('token-input');
const statusMessage = document.getElementById('statusMessage');
const btcButton = document.getElementById('btc');
const ethButton = document.getElementById('eth');


await chrome.storage.sync.get('githubToken', async (data) => {
    if (data.githubToken){
        tokenInput.value = data.githubToken;        
        tokenInput.dispatchEvent(new Event('input'));
    }
});

tokenInput.addEventListener('input', async () => {
    const token = tokenInput.value.trim();
    statusMessage.textContent = 'Validating token...';
    await validateToken(token);
});

function showToast(message, toastId) {
    const toast = document.getElementById(toastId);
    toast.innerText = message;
    toast.style.opacity = 1;
    setTimeout(() => {
        toast.style.opacity = 0;
        setTimeout(() => {
            toast.innerText = '';
        }, 500);
    }, 900);
}

function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}


async function validateToken(token){
    try {
        const response = await fetch(`https://api.github.com/user`, {
            headers: { Authorization: `Bearer ${token}`},
        });       

        if (response.status === 200) {          
            statusMessage.textContent = 'Valid Token (saved)';                               

        } else if (response.status === 401) {
            statusMessage.textContent = 'Expired or Invalid Token (not saved)';

        } else {        
            statusMessage.textContent = `Error: ${response.status} - ${await response.text()}`;
        }

        if (response.status === 200) {
            await chrome.storage.sync.set({ githubToken: token });
            await chrome.action.setBadgeText({ text: '' });            
        }else{
            await chrome.storage.sync.remove("githubToken");
            await showAlertBadge();                
        }
    } catch (error) {        
        statusMessage.textContent = error.toString();
    }    
}

async function showAlertBadge() {
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeTextColor({ color: 'white' });
    await chrome.action.setBadgeBackgroundColor({ color: 'red' });
}









