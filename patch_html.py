import re

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update button
old_btn = '<button class="btn" id="uploadCsvBtn"><span class="icon" data-icon="download"></span> Upload CSV</button>'
new_btn = '<button class="btn" id="uploadCsvBtn"><span class="icon" data-icon="upload-cloud"></span> Import Statement</button>'
content = content.replace(old_btn, new_btn)

# 2. Add import modal before csvPreviewModal
import_modal = """
    <!-- Import File Modal -->
    <dialog id="importModal" class="modal">
      <div class="modal-content" style="max-width: 500px; text-align: center;">
        <h2 class="card-title">Import Statement</h2>
        <p class="card-sub">Upload your bank statement (.csv, .xlsx, .xls, .pdf)</p>
        <div id="dropZone" style="border: 2px dashed var(--b-300); border-radius: 8px; padding: 40px; margin: 20px 0; cursor: pointer; transition: background 0.3s;">
          <span class="icon" data-icon="upload-cloud" style="font-size: 32px; color: var(--text-muted); margin-bottom: 12px; display: inline-block;"></span>
          <p style="margin: 0; color: var(--text-main);">Drag & drop a file here</p>
          <p style="margin: 8px 0; color: var(--text-muted); font-size: 14px;">or click to browse</p>
          <input type="file" id="importFileInput" accept=".csv, .xlsx, .xls, .pdf" hidden>
        </div>
        <div id="importFileDetails" style="display: none; margin-bottom: 20px; text-align: left; padding: 12px; background: var(--b-100); border-radius: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="overflow:hidden; text-overflow: ellipsis; white-space: nowrap;">
              <strong id="importFileName" style="display: block; color: var(--text-main);"></strong>
              <span id="importFileSize" style="font-size: 12px; color: var(--text-muted);"></span>
            </div>
            <button class="btn btn-outline" id="importClearBtn" style="padding: 4px 8px; font-size: 12px;">Change</button>
          </div>
        </div>
        <div class="modal-actions" style="justify-content: flex-end;">
          <button class="btn btn-outline" id="importCancelBtn">Cancel</button>
          <button class="btn" id="importProcessBtn" disabled>Process File</button>
        </div>
      </div>
    </dialog>
"""

# 3. Update preview modal
old_preview = """    <dialog id="csvPreviewModal" class="modal">
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
    </dialog>"""

new_preview = """    <dialog id="csvPreviewModal" class="modal">
      <div class="modal-content" style="max-width: 1000px; width: 90vw;">
        <h2 class="card-title">Review Import</h2>
        <p class="card-sub" id="csvPreviewStats"></p>
        
        <div style="display:flex; gap:16px; margin-bottom: 16px; font-size: 14px; background: var(--b-100); padding: 12px; border-radius: 8px;">
          <div style="flex:1"><strong>Valid Records:</strong> <span id="previewValidCount">0</span></div>
          <div style="flex:1"><strong>Duplicates:</strong> <span id="previewDupCount">0</span></div>
          <div style="flex:1"><strong>Total Income:</strong> <span id="previewIncome" class="tone-green">0</span></div>
          <div style="flex:1"><strong>Total Expense:</strong> <span id="previewExpense" class="tone-red">0</span></div>
        </div>

        <div class="table-wrap" style="max-height: 400px; overflow-y: auto;">
          <table class="tx-table compact" id="csvPreviewTable">
            <thead>
              <tr>
                <th style="width: 40px;"><input type="checkbox" id="selectAllTx" checked title="Select/Deselect All"></th>
                <th>Date</th>
                <th>Merchant / Description</th>
                <th class="num">Amount</th>
                <th>Type</th>
                <th>Category</th>
                <th>Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <div style="margin-top: 10px; display:flex; justify-content: space-between; align-items:center;">
          <div id="previewPagination" style="font-size: 14px;"></div>
          <div class="modal-actions" style="display:flex; justify-content:flex-end; gap:12px;">
            <button class="btn btn-outline" id="csvCancelBtn">Cancel</button>
            <button class="btn" id="csvConfirmBtn">Confirm Import</button>
          </div>
        </div>
      </div>
    </dialog>"""

content = content.replace(old_preview, import_modal + "\n" + new_preview)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)

print("index.html updated successfully!")
