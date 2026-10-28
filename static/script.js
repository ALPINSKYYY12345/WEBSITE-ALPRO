document.addEventListener("DOMContentLoaded", () => {
  const formTransaksi = document.getElementById("form-transaksi");
  const filterJenis = document.getElementById("filter");
  const filterBulan = document.getElementById("filter-bulan");
  const filterTahun = document.getElementById("filter-tahun");
  const tbodyDaftar = document.getElementById("daftar");

  const elemSaldo = document.getElementById("saldo");
  const elemPemasukan = document.getElementById("pemasukan");
  const elemPengeluaran = document.getElementById("pengeluaran");

  const selectJenis = document.getElementById("jenis");
  const selectKategori = document.getElementById("kategori");
  const btnChartTypes = document.querySelectorAll(".btn-chart-type");

  let activeChartType = "doughnut";
  let chartInstance = null;
  let currentTransaksiData = [];

  // Scrollspy & Active Sidebar State
  const sectionTambah = document.getElementById("tambah");
  const sectionRiwayat = document.getElementById("riwayat");

  const sidebarLinks = {
    dashboard: document.querySelector('.sidebar a[href="#dashboard"]'),
    tambah: document.querySelector('.sidebar a[href="#tambah"]'),
    riwayat: document.querySelector('.sidebar a[href="#riwayat"]')
  };

  function setActiveLink(activeKey) {
    Object.keys(sidebarLinks).forEach(key => {
      if (sidebarLinks[key]) {
        sidebarLinks[key].classList.toggle("active", key === activeKey);
      }
    });
  }

  window.addEventListener("scroll", () => {
    const scrollPos = window.scrollY + 200;
    const topTambah = sectionTambah ? sectionTambah.offsetTop : 0;
    const topRiwayat = sectionRiwayat ? sectionRiwayat.offsetTop : 0;

    if (scrollPos >= topRiwayat) {
      setActiveLink("riwayat");
    } else if (scrollPos >= topTambah) {
      setActiveLink("tambah");
    } else {
      setActiveLink("dashboard");
    }
  });

  Object.keys(sidebarLinks).forEach(key => {
    if (sidebarLinks[key]) {
      sidebarLinks[key].addEventListener("click", () => setActiveLink(key));
    }
  });

  // Opsi Kategori Dinamis
  const kategoriMap = {
    pengeluaran: ["Makanan & Minuman", "Transportasi", "Kebutuhan Kos", "Pendidikan", "Hiburan", "Lain-lain"],
    pemasukan: ["Uang Saku", "Gaji/Freelance", "Beasiswa", "Lain-lain"]
  };

  function updateKategoriOptions() {
    if (!selectJenis || !selectKategori) return;
    const jenis = selectJenis.value;
    selectKategori.innerHTML = "";

    if (kategoriMap[jenis]) {
      kategoriMap[jenis].forEach(kat => {
        const opt = document.createElement("option");
        opt.value = kat;
        opt.textContent = kat;
        selectKategori.appendChild(opt);
      });
    }
  }

  if (selectJenis) {
    selectJenis.addEventListener("change", updateKategoriOptions);
    updateKategoriOptions();
  }

  function formatRupiah(angka) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(angka);
  }

  // Render Grafik (Chart.js)
  function renderChart(transaksiList) {
    const ctx = document.getElementById("grafik");
    if (!ctx) return;

    currentTransaksiData = transaksiList;

    let totalPemasukan = 0;
    let totalPengeluaran = 0;

    transaksiList.forEach(t => {
      if (t.jenis === "pemasukan") totalPemasukan += Number(t.jumlah);
      else if (t.jenis === "pengeluaran") totalPengeluaran += Number(t.jumlah);
    });

    const saldo = totalPemasukan - totalPengeluaran;

    let chartLabels = [];
    let chartData = [];
    let chartColors = [];

    if (saldo <= 0 && totalPengeluaran > 0) {
      chartLabels = ["Pengeluaran (Defisit)"];
      chartData = [totalPengeluaran];
      chartColors = ["#ee6c7a"];
    } else {
      chartLabels = ["Sisa Saldo", "Pengeluaran"];
      chartData = [saldo, totalPengeluaran];
      chartColors = ["#20a67d", "#ee6c7a"];
    }

    if (chartInstance) {
      chartInstance.destroy();
    }

    const optionsConfig = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 800,
        easing: "easeOutQuart"
      },
      plugins: {
        legend: { 
          position: "bottom",
          display: activeChartType !== "bar" && activeChartType !== "line"
        }
      }
    };

    if (activeChartType === "bar" || activeChartType === "line") {
      optionsConfig.scales = { y: { beginAtZero: true } };
    }

    const datasetConfig = {
      label: "Jumlah (Rp)",
      data: chartData,
      backgroundColor: activeChartType === "line" ? "rgba(107, 85, 235, 0.2)" : chartColors,
      borderColor: activeChartType === "line" ? "#6b55eb" : undefined,
      borderWidth: 2,
      borderRadius: activeChartType === "bar" ? 6 : 0,
      fill: activeChartType === "line",
      tension: activeChartType === "line" ? 0.3 : 0,
      pointBackgroundColor: activeChartType === "line" ? chartColors : undefined,
      pointRadius: activeChartType === "line" ? 6 : undefined
    };

    chartInstance = new Chart(ctx, {
      type: activeChartType,
      data: {
        labels: chartLabels,
        datasets: [datasetConfig]
      },
      options: optionsConfig
    });
  }

  // Event Tombol Tipe Grafik
  btnChartTypes.forEach(btn => {
    btn.addEventListener("click", () => {
      btnChartTypes.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeChartType = btn.getAttribute("data-type");
      renderChart(currentTransaksiData);
    });
  });

  // Fetch & Memuat Data
  async function muatTransaksi() {
    const bulan = filterBulan ? filterBulan.value : "semua";
    const tahun = filterTahun ? filterTahun.value : "semua";
    const jenis = filterJenis ? filterJenis.value : "semua";

    const params = new URLSearchParams({ bulan, tahun, jenis });

    try {
      const res = await fetch(`/api/transaksi?${params.toString()}`);
      const data = await res.json();

      tampilkanTabel(data);
      updateSummary(data);
      renderChart(data);
    } catch (err) {
      console.error("Gagal memuat data transaksi:", err);
    }
  }

  // Render Tabel Transaksi
  function tampilkanTabel(transaksiList) {
    if (!tbodyDaftar) return;
    tbodyDaftar.innerHTML = "";

    if (!transaksiList || transaksiList.length === 0) {
      tbodyDaftar.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: #888; padding: 20px;">
            <em>Tidak ada transaksi pada periode ini (Kosong)</em>
          </td>
        </tr>
      `;
      return;
    }

    transaksiList.forEach((t, idx) => {
      const tr = document.createElement("tr");
      tr.style.animationDelay = `${idx * 0.05}s`;

      const badgeClass = t.jenis === "pemasukan" ? "text-success" : "text-danger";
      const tanda = t.jenis === "pemasukan" ? "+" : "-";

      tr.innerHTML = `
        <td>${t.tanggal}</td>
        <td>${t.keterangan}</td>
        <td><span class="badge">${t.kategori}</span></td>
        <td><span class="${badgeClass}">${t.jenis}</span></td>
        <td style="font-weight: 600;">${tanda} ${formatRupiah(t.jumlah)}</td>
        <td>
          <button class="btn-hapus" data-id="${t.id}">Hapus</button>
        </td>
      `;

      tbodyDaftar.appendChild(tr);
    });

    document.querySelectorAll(".btn-hapus").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.getAttribute("data-id");
        if (confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
          await fetch(`/api/transaksi/${id}`, { method: "DELETE" });
          muatTransaksi();
        }
      });
    });
  }

  // Ringkasan Total Saldo
  function updateSummary(transaksiList) {
    let totalPemasukan = 0;
    let totalPengeluaran = 0;

    transaksiList.forEach(t => {
      if (t.jenis === "pemasukan") totalPemasukan += Number(t.jumlah);
      else if (t.jenis === "pengeluaran") totalPengeluaran += Number(t.jumlah);
    });

    const saldo = totalPemasukan - totalPengeluaran;

    if (elemPemasukan) elemPemasukan.textContent = formatRupiah(totalPemasukan);
    if (elemPengeluaran) elemPengeluaran.textContent = formatRupiah(totalPengeluaran);
    if (elemSaldo) {
      elemSaldo.textContent = formatRupiah(saldo);
      elemSaldo.style.color = saldo < 0 ? "#ee6c7a" : "#1d2740";
    }
  }

  if (filterBulan) filterBulan.addEventListener("change", muatTransaksi);
  if (filterTahun) filterTahun.addEventListener("change", muatTransaksi);
  if (filterJenis) filterJenis.addEventListener("change", muatTransaksi);

  // Submit Handler
  if (formTransaksi) {
    formTransaksi.addEventListener("submit", async (e) => {
      e.preventDefault();

      const btnSubmit = formTransaksi.querySelector('button[type="submit"]');
      const textAwal = btnSubmit.innerHTML;

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = "⏳ Menyimpan...";

      const payload = {
        jenis: document.getElementById("jenis").value,
        jumlah: parseInt(document.getElementById("jumlah").value),
        kategori: document.getElementById("kategori").value,
        keterangan: document.getElementById("keterangan").value,
        tanggal: document.getElementById("tanggal").value
      };

      try {
        const res = await fetch("/api/transaksi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          formTransaksi.reset();
          updateKategoriOptions();
          muatTransaksi();
        } else {
          const errData = await res.json();
          alert(errData.error || "Gagal menyimpan transaksi.");
        }
      } catch (err) {
        console.error("Error menambah transaksi:", err);
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = textAwal;
      }
    });
  }

  muatTransaksi();
});