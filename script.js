function addMessage(sender, text) {
  const chat = document.getElementById("chat");
  const msg = document.createElement("div");
  msg.className = "message " + sender;

  let formattedText = (sender === "user" ? "" : "") + text;

  formattedText = formattedText.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>"
  );

  let lines = formattedText.split("\n");

  let inList = false;
  let result = "";

  for (let line of lines) {
    let trimmed = line.trim();
    if (trimmed.startsWith("* ")) {
      let content = trimmed.substring(2).trim();
      if (content !== "") {
        if (!inList) {
          result += "<ul>";
          inList = true;
        }
        result += `<li>${content}</li>`;
      }
    } else {
      if (inList) {
        result += "</ul>";
        inList = false;
      }
      result += trimmed + "<br>";
    }
  }

  if (inList) result += "</ul>";

  msg.innerHTML = result;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function sendMsg() {
  const input = document.getElementById("userInput");
  const text = input.value.trim();
  if (!text) return;

  addMessage("user", text);
  input.value = "";

  fetch("https://glint-backend-7d4a.onrender.com/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text }),
  })
    .then((res) => res.json())
    .then((data) => {
      addMessage("bot", data.reply);
    })
    .catch(() => {
      addMessage("bot", "Error communicating with server.");
    });
}

document.getElementById("userInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter") sendMsg();
});