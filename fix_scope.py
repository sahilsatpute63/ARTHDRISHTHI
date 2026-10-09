import os

def fix_script_js():
    with open('c:/antigravity/ARTHDRISHTHI/script.js', 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Split the content by the CSV Import Logic marker we introduced
    marker = "// CSV Import Logic"
    if marker in content:
        main_script = content.split(marker)[0]
    else:
        main_script = content

    # The main_script ends with `})();` maybe with some whitespace.
    # Let's cleanly remove `})();` from the end of it so we can append our code inside the IIFE.
    main_script = main_script.strip()
    if main_script.endswith("})();"):
        main_script = main_script[:-5].strip()
    
    # We create the new correct CSV logic that uses `toast`
    csv_logic = """

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
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `CSV preview failed: ${res.status}`);
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
        toast("Failed to preview CSV: " + err.message);
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
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Import failed: ${res.status}`);
        }
        
        const result = await res.json();
        toast(`Successfully imported ${result.imported_count} transactions!`);
        csvPreviewModal.close();
        
        // Refresh dashboard and transactions
        await loadStateFromAPI();
        
      } catch(err) {
        toast("Failed to confirm import: " + err.message);
      } finally {
        csvConfirmBtn.disabled = false;
        csvConfirmBtn.textContent = "Confirm Import";
      }
    });
  }
})();
"""
    final_content = main_script + csv_logic
    
    with open('c:/antigravity/ARTHDRISHTHI/script.js', 'w', encoding='utf-8') as f:
        f.write(final_content)

if __name__ == "__main__":
    fix_script_js()
    print("Fixed script.js")
