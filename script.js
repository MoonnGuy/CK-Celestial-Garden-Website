function showMessage() {
  alert("Welcome to my first website!");
}

const translations = {
    en: {
      logo: "MyWebsite",
      home: "Home",
      about: "About",
      services: "Services",
      contact: "Contact",
  
      heroTitle: "Welcome to My Website",
      heroText: "This is a simple beginner-friendly website built with HTML, CSS, and JavaScript.",
      clickMe: "Click Me",
  
      aboutTitle: "About Us",
      aboutText: "We create clean, modern, and responsive websites for businesses, portfolios, and personal brands.",
  
      servicesTitle: "Our Services",
      webDesign: "Web Design",
      webDesignText: "Modern and responsive website layouts.",
      development: "Development",
      developmentText: "Functional websites using HTML, CSS, and JavaScript.",
      seo: "SEO Basics",
      seoText: "Simple optimization to help people find your website.",
  
      contactTitle: "Contact Us",
      yourName: "Your Name",
      yourEmail: "Your Email",
      yourMessage: "Your Message",
      sendMessage: "Send Message",
  
      footerText: "© 2026 MyWebsite. All rights reserved.",
      alertMessage: "Welcome to my first website!"
    },
  
    vi: {
      logo: "Trang Web Của Tôi",
      home: "Trang chủ",
      about: "Giới thiệu",
      services: "Dịch vụ",
      contact: "Liên hệ",
  
      heroTitle: "Chào mừng đến với trang web của tôi",
      heroText: "Đây là một trang web đơn giản dành cho người mới bắt đầu, được xây dựng bằng HTML, CSS và JavaScript.",
      clickMe: "Bấm vào đây",
  
      aboutTitle: "Về Chúng Tôi",
      aboutText: "Chúng tôi tạo ra các trang web đẹp, hiện đại và tương thích với nhiều thiết bị cho doanh nghiệp, hồ sơ cá nhân và thương hiệu cá nhân.",
  
      servicesTitle: "Dịch Vụ Của Chúng Tôi",
      webDesign: "Thiết Kế Web",
      webDesignText: "Giao diện website hiện đại và responsive.",
      development: "Phát Triển Website",
      developmentText: "Xây dựng website bằng HTML, CSS và JavaScript.",
      seo: "SEO Cơ Bản",
      seoText: "Tối ưu hóa đơn giản để giúp người dùng tìm thấy website của bạn.",
  
      contactTitle: "Liên Hệ",
      yourName: "Tên của bạn",
      yourEmail: "Email của bạn",
      yourMessage: "Tin nhắn của bạn",
      sendMessage: "Gửi Tin Nhắn",
  
      footerText: "© 2026 Trang Web Của Tôi. Đã đăng ký bản quyền.",
      alertMessage: "Chào mừng bạn đến với website đầu tiên của tôi!"
    }
  };
  
  function setLanguage(language) {
    localStorage.setItem("selectedLanguage", language);
  
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      element.textContent = translations[language][key];
    });
  
    document.querySelectorAll("[data-placeholder]").forEach((element) => {
      const key = element.getAttribute("data-placeholder");
      element.placeholder = translations[language][key];
    });
  
    document.getElementById("languageSelect").value = language;
  
    const languageModal = document.getElementById("languageModal");
    languageModal.style.display = "none";
  }
  
  function showMessage() {
    const language = localStorage.getItem("selectedLanguage") || "en";
    alert(translations[language].alertMessage);
  }
  
  window.onload = function () {
    const savedLanguage = localStorage.getItem("selectedLanguage");
  
    if (savedLanguage) {
      setLanguage(savedLanguage);
    } else {
      document.getElementById("languageModal").style.display = "flex";
    }
  };

  