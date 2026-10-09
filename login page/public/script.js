(function () {
  "use strict";

  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var MIN_PASSWORD_LENGTH = 8;

  function setFieldError(input, message) {
    var errorEl = document.getElementById(input.getAttribute("aria-describedby"));
    if (message) {
      input.setAttribute("aria-invalid", "true");
      if (errorEl) errorEl.textContent = message;
    } else {
      input.removeAttribute("aria-invalid");
      if (errorEl) errorEl.textContent = "";
    }
  }

  function validateEmail(input) {
    var value = input.value.trim();
    if (!value) return "Please enter your email address.";
    if (!EMAIL_PATTERN.test(value)) return "Please enter a valid email address.";
    return "";
  }

  function validatePassword(input) {
    var value = input.value;
    if (!value) return "Please enter your password.";
    if (value.length < MIN_PASSWORD_LENGTH) {
      return "Password must be at least " + MIN_PASSWORD_LENGTH + " characters.";
    }
    return "";
  }

  function validateRequired(input, label) {
    return input.value.trim() ? "" : "Please enter your " + label + ".";
  }

  function liveValidate(input, validator) {
    input.addEventListener("blur", function () {
      if (input.value) setFieldError(input, validator(input));
    });
    input.addEventListener("input", function () {
      if (input.getAttribute("aria-invalid") === "true") {
        setFieldError(input, validator(input));
      }
    });
  }

  /* ---------------- Login form ---------------- */

  var loginForm = document.getElementById("login-form");
  var emailInput = document.getElementById("email");
  var passwordInput = document.getElementById("password");
  var signInBtn = document.getElementById("signin-btn");
  var signInLabel = signInBtn.querySelector(".btn-label");
  var formStatus = document.getElementById("form-status");

  // Check for genuine logout confirmation
  var urlParams = new URLSearchParams(window.location.search);
  var logoutMsg = sessionStorage.getItem("logout_message");
  if (urlParams.get("logged_out") === "1" || logoutMsg) {
    formStatus.textContent = logoutMsg || "You have been successfully and securely logged out.";
    formStatus.style.color = "#0B5A50";
    formStatus.style.fontWeight = "600";
    sessionStorage.removeItem("logout_message");
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  liveValidate(emailInput, validateEmail);
  liveValidate(passwordInput, validatePassword);

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (signInBtn.classList.contains("is-loading")) return;

    formStatus.textContent = "";
    formStatus.style.color = "";
    var emailError = validateEmail(emailInput);
    var passwordError = validatePassword(passwordInput);
    setFieldError(emailInput, emailError);
    setFieldError(passwordInput, passwordError);

    if (emailError) {
      emailInput.focus();
      return;
    }
    if (passwordError) {
      passwordInput.focus();
      return;
    }

    signInBtn.classList.add("is-loading");
    signInBtn.setAttribute("aria-busy", "true");
    signInLabel.textContent = "Signing in";

    var formData = new FormData();
    formData.append("username", emailInput.value.trim());
    formData.append("password", passwordInput.value);

    fetch("http://localhost:8000/api/v1/auth/login", {
      method: "POST",
      body: formData
    })
    .then(function (res) {
      if (!res.ok) {
        return res.json().then(function(err) { throw new Error(err.detail || "Incorrect email or password"); });
      }
      return res.json();
    })
    .then(function (data) {
      localStorage.setItem("ffs_token", data.access_token);
      localStorage.removeItem("ffs-state-v1");
      window.location.replace("/");
    })
    .catch(function (err) {
      signInBtn.classList.remove("is-loading");
      signInBtn.removeAttribute("aria-busy");
      signInLabel.textContent = "Sign In";
      formStatus.textContent = err.message;
      formStatus.style.color = "#D94343";
    });
  });

  /* ---------------- Password toggle ---------------- */

  var toggleBtn = document.querySelector(".toggle-password");
  toggleBtn.addEventListener("click", function () {
    var isVisible = passwordInput.type === "text";
    var start = passwordInput.selectionStart;
    var end = passwordInput.selectionEnd;

    passwordInput.type = isVisible ? "password" : "text";
    toggleBtn.setAttribute("aria-pressed", String(!isVisible));
    toggleBtn.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");

    passwordInput.focus();
    if (start !== null && end !== null) {
      try {
        passwordInput.setSelectionRange(start, end);
      } catch (e) {
        /* some input types do not support selection */
      }
    }
  });

  /* ---------------- Dialogs ---------------- */

  var lastTrigger = null;

  function openDialog(dialog, trigger) {
    if (!dialog || dialog.open) return;
    lastTrigger = trigger || document.activeElement;
    resetDialog(dialog);
    dialog.showModal();
    var firstInput = dialog.querySelector("input");
    if (firstInput) firstInput.focus();
  }

  function closeDialog(dialog) {
    if (dialog && dialog.open) dialog.close();
  }

  function resetDialog(dialog) {
    var form = dialog.querySelector("form");
    if (form) form.reset();
    dialog.querySelectorAll("input").forEach(function (input) {
      setFieldError(input, "");
    });
    var note = dialog.querySelector(".modal-note");
    if (note) note.textContent = "";
  }

  document.querySelectorAll(".modal").forEach(function (dialog) {
    dialog.addEventListener("close", function () {
      if (lastTrigger && typeof lastTrigger.focus === "function") lastTrigger.focus();
    });

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeDialog(dialog);
    });

    dialog.querySelectorAll("[data-close]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        closeDialog(dialog);
      });
    });
  });

  document.querySelectorAll("[data-open]").forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      var dialog = document.getElementById(trigger.getAttribute("data-open"));
      openDialog(dialog, trigger);
      if (trigger.getAttribute("data-open") === "forgot-dialog" && emailInput.value.trim()) {
        document.getElementById("forgot-email").value = emailInput.value.trim();
      }
    });
  });

  /* Forgot password */
  var forgotForm = document.getElementById("forgot-form");
  var forgotEmail = document.getElementById("forgot-email");
  liveValidate(forgotEmail, validateEmail);

  forgotForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var error = validateEmail(forgotEmail);
    setFieldError(forgotEmail, error);
    if (error) {
      forgotEmail.focus();
      return;
    }
    forgotForm.querySelector(".modal-note").textContent =
      "Demo only: password recovery emails will be sent once a backend is connected.";
  });

  /* Create account */
  var registerForm = document.getElementById("register-form");
  var regName = document.getElementById("reg-name");
  var regEmail = document.getElementById("reg-email");
  var regPassword = document.getElementById("reg-password");
  var validateName = function (input) {
    return validateRequired(input, "full name");
  };

  liveValidate(regName, validateName);
  liveValidate(regEmail, validateEmail);
  liveValidate(regPassword, validatePassword);

  registerForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var checks = [
      [regName, validateName(regName)],
      [regEmail, validateEmail(regEmail)],
      [regPassword, validatePassword(regPassword)],
    ];
    var firstInvalid = null;
    checks.forEach(function (pair) {
      setFieldError(pair[0], pair[1]);
      if (pair[1] && !firstInvalid) firstInvalid = pair[0];
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }
    registerForm.querySelector(".modal-note").textContent =
      "Demo only: account creation will be available once a backend is connected.";
  });

  /* Feature previews */
  var FEATURES = {
    insights: {
      title: "Smart Insights",
      text: "Automatically categorize every transaction and surface the patterns that matter most to your budget.",
      stat: "12+",
      statLabel: "spending categories tracked automatically",
      points: ["Weekly spending summaries", "Unusual expense alerts", "Category trends over time"],
    },
    goals: {
      title: "Goal Planning",
      text: "Turn big dreams into clear monthly milestones, from an emergency fund to your first home.",
      stat: "3 steps",
      statLabel: "to set up any financial goal",
      points: ["Target amounts and deadlines", "Monthly contribution guidance", "Progress tracking with milestones"],
    },
    simulation: {
      title: "Future Simulation",
      text: "Model life decisions before you make them and see how each choice shapes your financial future.",
      stat: "10 yrs",
      statLabel: "of projected cash flow at a glance",
      points: ["What-if scenarios for big purchases", "Income and expense projections", "Side-by-side plan comparisons"],
    },
    health: {
      title: "Stay Financially Healthy",
      text: "A continuous health check that flags risks early and recommends practical next steps.",
      stat: "24/7",
      statLabel: "risk monitoring across your accounts",
      points: ["Overall financial health score", "Debt and savings risk detection", "Personalized recommendations"],
    },
  };

  var featureDialog = document.getElementById("feature-dialog");
  document.querySelectorAll(".feature[data-feature]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var data = FEATURES[btn.getAttribute("data-feature")];
      if (!data) return;
      featureDialog.querySelector("[data-feature-title]").textContent = data.title;
      featureDialog.querySelector("[data-feature-text]").textContent = data.text;
      featureDialog.querySelector("[data-feature-stat]").textContent = data.stat;
      featureDialog.querySelector("[data-feature-stat-label]").textContent = data.statLabel;
      var list = featureDialog.querySelector("[data-feature-points]");
      list.textContent = "";
      data.points.forEach(function (point) {
        var li = document.createElement("li");
        li.textContent = point;
        list.appendChild(li);
      });
      openDialog(featureDialog, btn);
      featureDialog.querySelector(".btn-primary").focus();
    });
  });

  /* Social providers */
  var socialDialog = document.getElementById("social-dialog");
  document.querySelectorAll(".social-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var provider = btn.getAttribute("data-provider");
      socialDialog.querySelectorAll("[data-provider-name]").forEach(function (el) {
        el.textContent = provider;
      });
      openDialog(socialDialog, btn);
      var confirmBtn = socialDialog.querySelector(".btn-primary");
      if (confirmBtn) confirmBtn.focus();
    });
  });
})();
