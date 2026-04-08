fetch("https://YOUR_URL.up.railway.app/chart", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    year: 1995,
    month: 5,
    day: 10,
    hour: 14,
    minute: 30,
    second: 0,
    lat: 41.7151,
    lon: 44.8271,
    tz_name: "Asia/Tbilisi"
  })
})
.then(res => res.json())
.then(data => console.log(data));
