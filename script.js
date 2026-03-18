// =======================
// IMPORT FIREBASE SERVICES
// =======================
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const db = window.db; // exposed in HTML via Firebase SDK

// =======================
// STUDENT APPLICATION LOGIC
// =======================
if (document.getElementById("fundForm")) {
  // Extract uniqueID from path like /apply/d/<uniqueID>
  const pathParts = window.location.pathname.split("/");
  const uniqueID = pathParts[pathParts.length - 1];

  async function validateLink() {
    if (!uniqueID) {
      alert("This application link is invalid or expired.");
      window.location.href = "index.html";
      return false;
    }

    const docRef = doc(db, "applyLinks", uniqueID);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || !docSnap.data().active) {
      alert("This application link is invalid or expired.");
      window.location.href = "index.html";
      return false;
    }
    return docSnap.data();
  }

  let linkData = null;
  validateLink().then(data => { linkData = data; });

  document.getElementById("fundForm").onsubmit = async e => {
    e.preventDefault();

    const email = document.getElementById("studentEmail").value;
    const studentID = document.getElementById("studentID").value;
    const mobileNumber = document.getElementById("mobileNumber").value;
    const amount = parseInt(document.getElementById("amount").value, 10);

    if (amount < 20 || amount > 50) {
      alert("Requested amount must be between GH₵20 and GH₵50.");
      return;
    }

    // Prevent duplicate applications for the same month
    const q = query(
      collection(db, "applications"),
      where("month", "==", linkData.month),
      where("studentID", "==", studentID)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      alert("You already applied this month. Application rejected.");
      return;
    }

    await addDoc(collection(db, "applications"), {
      name: document.getElementById("studentName").value,
      email,
      studentID,
      amount,
      mobileNumber,
      reason: document.getElementById("reason").value,
      status: "Pending",
      month: linkData.month,
      code: uniqueID,
      disbursedAt: null,
      createdAt: new Date().toISOString()
    });

    alert("Application submitted successfully for " + linkData.month + "!");
    window.location.href = "index.html";
  };
}

// =======================
// ADMIN DASHBOARD LOGIC
// =======================
async function loadApplications(filterStatus = "All", searchQuery = "", filterMonth = "All") {
  const table = document.getElementById("applicationsTable");
  if (!table) return;
  table.innerHTML = "";

  const snapshot = await getDocs(collection(db, "applications"));
  snapshot.forEach(docSnap => {
    const app = docSnap.data();
    const id = docSnap.id;

    if (filterStatus !== "All" && app.status !== filterStatus) return;
    if (filterMonth !== "All" && app.month !== filterMonth) return;
    if (searchQuery && !(
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.studentID.toLowerCase().includes(searchQuery.toLowerCase())
    )) return;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td data-label="Name">${app.name}</td>
      <td data-label="Email">${app.email}</td>
      <td data-label="Student ID">${app.studentID}</td>
      <td data-label="Amount">GH₵${app.amount}</td>
      <td data-label="Mobile Number">${app.mobileNumber}</td>
      <td data-label="Reason">${app.reason}</td>
      <td data-label="Status">${app.status}${app.disbursedAt ? `<br><small>${app.disbursedAt}</small>` : ""}</td>
      <td data-label="Month">${app.month}</td>
      <td data-label="Action">
        <button class="action-btn btn-approve" onclick="updateStatus('${id}', 'Approved')">Approve</button>
        <button class="action-btn btn-reject" onclick="updateStatus('${id}', 'Rejected')">Reject</button>
        <button class="action-btn btn-disburse" onclick="disburseFunds('${id}')">Disburse</button>
      </td>
    `;
    table.appendChild(row);
  });
}

if (document.getElementById("applicationsTable")) {
  populateMonthFilter();
  loadApplications();
}

async function updateStatus(id, newStatus) {
  await updateDoc(doc(db, "applications", id), { status: newStatus });
  applyFilters();
}

async function disburseFunds(id) {
  const appRef = doc(db, "applications", id);
  await updateDoc(appRef, {
    status: "Paid",
    disbursedAt: new Date().toLocaleString()
  });
  alert("Funds disbursed successfully.");
  applyFilters();
}

function applyFilters() {
  const status = document.getElementById("statusFilter").value;
  const queryText = document.getElementById("searchBox").value;
  const month = document.getElementById("monthFilter").value;
  loadApplications(status, queryText, month);
}

// =======================
// EXPORT CSV
// =======================
async function exportCSV() {
  const snapshot = await getDocs(collection(db, "applications"));
  if (snapshot.empty) {
    alert("No applications to export.");
    return;
  }

  let csvContent = "Name,Email,Student ID,Amount,Mobile Number,Reason,Status,Month,Disbursed At\n";
  snapshot.forEach(docSnap => {
    const app = docSnap.data();
    const row = [
      `"${app.name}"`,
      `"${app.email}"`,
      `"${app.studentID}"`,
      `"${app.amount}"`,
      `"${app.mobileNumber}"`,
      `"${app.reason.replace(/"/g, '""')}"`,
      `"${app.status}"`,
      `"${app.month}"`,
      `"${app.disbursedAt || ""}"`
    ].join(",");
    csvContent += row + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "applications.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =======================
// GENERATE NEW APPLY LINK (Google Docs style)
// =======================
async function generateLink() {
  try {
    const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' }).replace(" ", "-");

    // Generate long random ID like Google Docs
    const uniqueID = crypto.randomUUID().replace(/-/g, '') + Math.random().toString(36).substring(2, 15);

    // Construct link with /apply/d/<uniqueID>
    const link = `${window.location.origin}/apply/d/${uniqueID}`;

    await setDoc(doc(db, "applyLinks", uniqueID), {
      month,
      code: uniqueID,
      createdAt: new Date().toISOString(),
      active: true
    });

    const linkElement = document.getElementById("currentLink");
    if (linkElement) {
      linkElement.value = link;
      linkElement.focus();
      linkElement.select();
    }

    alert("New application link generated!");
  } catch (error) {
    console.error("Error generating link:", error);
    alert("Failed to generate link. Please try again.");
  }
}

function copyLink() {
  const linkElement = document.getElementById("currentLink");
  const copyBtn = document.getElementById("copyBtn");

  if (linkElement && linkElement.value) {
    linkElement.select();
    document.execCommand("copy");

    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.textContent = "Copy Link";
    }, 2000);
  }
}

// =======================
// MONTH FILTER DROPDOWN
// =======================
async function populateMonthFilter() {
  const monthFilter = document.getElementById("monthFilter");
  if (!monthFilter) return;

  monthFilter.innerHTML = '<option value="All">All Months</option>';

  const snapshot = await getDocs(collection(db, "applications"));
  const months = [...new Set(snapshot.docs.map(doc => doc.data().month))];
  months.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    monthFilter.appendChild(opt);
  });
}

// =======================
// Expose functions globally
// =======================
window.applyFilters = applyFilters;
window.exportCSV = exportCSV;
window.generateLink = generateLink;
window.copyLink = copyLink;
window.updateStatus = updateStatus;
window.disburseFunds = disburseFunds;