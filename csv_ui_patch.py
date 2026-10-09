import os
import re

def patch_frontend():
    with open('c:/antigravity/ARTHDRISHTHI/index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Add Upload CSV button and hidden input
    target = '<div class="toolbar">'
    replacement = """<div class="toolbar">
                <div class="toolbar-actions" style="display:flex; gap:12px; margin-bottom: 16px;">
                  <button class="btn" id="uploadCsvBtn"><span class="icon" data-icon="download"></span> Upload CSV</button>
                  <input type="file" id="csvFileInput" accept=".csv" hidden>
                </div>"""
    
    if 'id="uploadCsvBtn"' not in html:
        html = html.replace(target, replacement, 1)
        
    # 2. Add Modal to the bottom
    modal = """
    <!-- CSV Preview Modal -->
    <dialog id="csvPreviewModal" class="modal">
      <div class="modal-content" style="max-width: 800px;">
        <h2 class="card-title">Review Import</h2>
        <p class="card-sub" id="csvPreviewStats"></p>
        <div class="table-wrap" style="max-height: 400px; overflow-y: auto;">
          <table class="tx-table compact" id="csvPreviewTable">
            <thead>
              <tr><th>Date</th><th>Merchant / Description</th><th class="num">Amount</th><th>Type</th><th>Category</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <div class="modal-actions" style="margin-top:20px; display:flex; justify-content:flex-end; gap:12px;">
          <button class="btn btn-outline" id="csvCancelBtn">Cancel</button>
          <button class="btn" id="csvConfirmBtn">Confirm Import</button>
        </div>
      </div>
    </dialog>
    """
    if 'id="csvPreviewModal"' not in html:
        html = html.replace("</body>", modal + "\n</body>")

    with open('c:/antigravity/ARTHDRISHTHI/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
        
    with open('c:/antigravity/ARTHDRISHTHI/script.js', 'r', encoding='utf-8') as f:
        js = f.read()
        
    js_patch = """
  // CSV Import Logic
  const uploadCsvBtn = document.getElementById("uploadCsvBtn");
  const csvFileInput = document.getElementById("csvFileInput");
  const csvPreviewModal = document.getElementById("csvPreviewModal");
  const csvCancelBtn = document.getElementById("csvCancelBtn");
  const csvConfirmBtn = document.getElementById("csvConfirmBtn");
  const csvPreviewStats = document.getElementById("csvPreviewStats");
  const csvPreviewTableBody = document.querySelector("#csvPreviewTable tbody");
  let currentImportId = null;

  if (uploadCsvBtn) {
    uploadCsvBtn.addEventListener("click", () => {
      csvFileInput.click();
    });

    csvFileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append("file", file);
      
      uploadCsvBtn.disabled = true;
      uploadCsvBtn.innerHTML = `<span class="icon" data-icon="activity"></span> Uploading...`;
      
      try {
        const token = localStorage.getItem("ffs_token");
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};
        const res = await fetch(API_BASE + "/transactions/import/preview", {
          method: "POST",
          headers: headers,
          body: formData
        });
        
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText);
        }
        
        const data = await res.json();
        currentImportId = data.import_id;
        
        csvPreviewStats.textContent = `Found ${data.total_rows} rows. ${data.valid_rows} valid transactions detected.`;
        csvPreviewTableBody.innerHTML = data.preview.map(tx => `
          <tr>
            <td>${tx.transaction_date}</td>
            <td>${esc(tx.merchant)}</td>
            <td class="num">${fmt(tx.amount)}</td>
            <td>${tx.transaction_type}</td>
            <td>${tx.category_id}</td>
          </tr>
        `).join("");
        
        csvPreviewModal.showModal();
        
      } catch(err) {
        alert("Failed to preview CSV: " + err.message);
      } finally {
        csvFileInput.value = "";
        uploadCsvBtn.disabled = false;
        uploadCsvBtn.innerHTML = `<span class="icon" data-icon="download"></span> Upload CSV`;
        hydrateIcons(uploadCsvBtn);
      }
    });

    csvCancelBtn.addEventListener("click", () => {
      csvPreviewModal.close();
      currentImportId = null;
    });

    csvConfirmBtn.addEventListener("click", async () => {
      if (!currentImportId) return;
      csvConfirmBtn.disabled = true;
      csvConfirmBtn.textContent = "Importing...";
      
      try {
        const token = localStorage.getItem("ffs_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        
        const res = await fetch(API_BASE + "/transactions/import/confirm", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ import_id: currentImportId })
        });
        
        if (!res.ok) throw new Error(await res.text());
        
        const result = await res.json();
        alert(`Successfully imported ${result.imported_count} transactions!`);
        csvPreviewModal.close();
        
        // Refresh dashboard and transactions
        await loadStateFromAPI();
        
      } catch(err) {
        alert("Failed to confirm import: " + err.message);
      } finally {
        csvConfirmBtn.disabled = false;
        csvConfirmBtn.textContent = "Confirm Import";
      }
    });
  }
"""
    if "const uploadCsvBtn = document.getElementById" not in js:
        js = js + js_patch
        with open('c:/antigravity/ARTHDRISHTHI/script.js', 'w', encoding='utf-8') as f:
            f.write(js)

if __name__ == "__main__":
    patch_frontend()
    print("Frontend UI patched")
