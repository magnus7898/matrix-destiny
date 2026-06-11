/* ════════════════════════════════════════════════════════════════════
   B3 KARMIC-TAIL COMBINATION ARTICLES
   Bottom red line: B3 (outer) · B2 (middle) · B1 (inner)
   Key format: "B3-B2-B1"
   Fill in each `article` string with your text (HTML allowed: <b>, <br>, <p>).
   ════════════════════════════════════════════════════════════════════ */

const B3_COMBINATIONS = {
  "10-13-3":  { title:"სუიციდი",                       article:"" },
  "10-4-21":  { title:"უუფლებო სული",                  article:"" },
  "19-22-3":  { title:"დაუბადებელი ბავშვი",            article:"" },
  "11-8-15":  { title:"მოძალადე",                      article:"" },
  "11-17-6":  { title:"დაკარგული ნიჭი",                article:"" },
  "20-8-6":   { title:"გვარის ღალატი",                 article:"" },
  "3-12-9":   { title:"მარტოხელა ქალი",                article:"" },
  "12-3-18":  { title:"ფიზიკური ტანჯვა",               article:"" },
  "21-3-9":   { title:"ჯალათი, ზედამხედველი",          article:"" },
  "4-16-12":  { title:"იმპერატორი",                    article:"" },
  "13-7-21":  { title:"მასობრივი სიკვდილი",            article:"" },
  "22-7-3":   { title:"თავისუფლება წართმეული სული",    article:"" },
  "5-20-15":  { title:"მეამბოხე",                      article:"" },
  "14-20-6":  { title:"მსხვერპლი",                     article:"" },
  "6-6-18":   { title:"სასიყვარულო მაგია",             article:"" },
  "6-15-9":   { title:"ზღაპრული სამყარო",              article:"" },
  "15-6-18":  { title:"შავი მაგი",                     article:"" },
  "7-10-21":  { title:"რწმენის რაინდი",                article:"" },
  "7-19-12":  { title:"მეომარი",                       article:"" },
  "16-10-21": { title:"სულიერი წინამძღოლი",            article:"" },
  "8-5-15":   { title:"ღალატი, ოჯახური პრობლემები",    article:"" },
  "8-14-6":   { title:"დიქტატორი",                     article:"" },
  "17-5-6":   { title:"სიამაყე",                       article:"" },
  "9-9-18":   { title:"ჯადოქარი",                      article:"" },
  "9-18-9":   { title:"მაგიური მსხვერპლი",             article:"" },
  "18-9-9":   { title:"ჯადოქარი",                      article:"" },
};

// Open the B3 article based on the current B3-B2-B1 combination
function openB3Article(B3, B2, B1){
  const key   = `${B3}-${B2}-${B1}`;
  const combo = B3_COMBINATIONS[key];
  const panel = document.getElementById('b3-article-panel');
  const body  = document.getElementById('b3-article-body');
  const head  = document.getElementById('b3-article-head');

  if(combo){
    head.innerHTML = `🔻 ${combo.title} <span style="opacity:.5;font-weight:400;font-size:11px">· ${B3}–${B2}–${B1}</span>`;
    body.innerHTML = combo.article && combo.article.trim()
      ? combo.article
      : `<div style="color:rgba(160,140,220,0.55);font-style:italic;padding:8px 0;">
           სტატია ჯერ არ არის შევსებული ამ კომბინაციისთვის (${B3}–${B2}–${B1}).
         </div>`;
  }else{
    head.innerHTML = `🔻 კარმული კუდი <span style="opacity:.5;font-weight:400;font-size:11px">· ${B3}–${B2}–${B1}</span>`;
    body.innerHTML = `<div style="color:rgba(160,140,220,0.55);padding:8px 0;">
        ამ კომბინაციისთვის (${B3}–${B2}–${B1}) სტატია არ მოიძებნა.
      </div>`;
  }
  panel.style.display = 'block';                       // reveal the closed box
  panel.scrollIntoView({behavior:'smooth', block:'nearest'});
}
