from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Data sementara di memori
transactions = [
    {
        "id": 1,
        "jenis": "pemasukan",
        "kategori": "Uang Saku",
        "jumlah": 2000000,
        "keterangan": "Transfer Orang Tua",
        "tanggal": "2026-10-01"
    },
    {
        "id": 2,
        "jenis": "pengeluaran",
        "kategori": "Makanan & Minuman",
        "jumlah": 50000,
        "keterangan": "Makan Siang",
        "tanggal": "2026-10-28"
    }
]

@app.route('/')
def index():
    return render_template('index.html')

# 1. API GET Transaksi (dengan dukungan Filter Bulan, Tahun, Jenis)
@app.route('/api/transaksi', methods=['GET'])
def get_transaksi():
    bulan = request.args.get('bulan', 'semua')
    tahun = request.args.get('tahun', 'semua')
    jenis = request.args.get('jenis', 'semua')

    filtered = transactions

    # Filter berdasarkan Jenis (pemasukan / pengeluaran)
    if jenis != 'semua':
        filtered = [t for t in filtered if t.get('jenis') == jenis]

    # Filter berdasarkan Bulan & Tahun dari string YYYY-MM-DD
    if bulan != 'semua' or tahun != 'semua':
        hasil_filter = []
        for t in filtered:
            tgl = t.get('tanggal', '')
            if tgl and len(tgl) >= 7:
                t_tahun, t_bulan, _ = tgl.split('-')
                
                match_bulan = (bulan == 'semua' or t_bulan == bulan)
                match_tahun = (tahun == 'semua' or t_tahun == tahun)
                
                if match_bulan and match_tahun:
                    hasil_filter.append(t)
        filtered = hasil_filter

    return jsonify(filtered)

# 2. API POST Tambah Transaksi
@app.route('/api/transaksi', methods=['POST'])
def tambah_transaksi():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Data tidak valid"}), 400

    new_id = len(transactions) + 1 if not transactions else max(t['id'] for t in transactions) + 1
    
    new_data = {
        "id": new_id,
        "jenis": data.get('jenis'),
        "kategori": data.get('kategori'),
        "jumlah": int(data.get('jumlah', 0)),
        "keterangan": data.get('keterangan'),
        "tanggal": data.get('tanggal')
    }
    
    transactions.append(new_data)
    return jsonify({"success": True, "data": new_data}), 201

# 3. API DELETE Hapus Transaksi
@app.route('/api/transaksi/<int:id>', methods=['DELETE'])
def hapus_transaksi(id):
    global transactions
    transactions = [t for t in transactions if t.get('id') != id]
    return jsonify({"success": True, "message": "Transaksi berhasil dihapus"}), 200

if __name__ == '__main__':
    app.run(debug=True)