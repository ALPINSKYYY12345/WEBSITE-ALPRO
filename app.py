import sqlite3
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = 'kunci_rahasia_dompet_mahasiswa'

DB_FILE = "database.db"

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

# Inisialisasi Tabel User & Transaksi
def init_db():
    with get_db() as conn:
        # Tabel User
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        ''')
        # Tabel Transaksi (Terikat ke user_id)
        conn.execute('''
            CREATE TABLE IF NOT EXISTS transaksi (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                jenis TEXT NOT NULL,
                kategori TEXT NOT NULL,
                jumlah INTEGER NOT NULL,
                keterangan TEXT NOT NULL,
                tanggal TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        conn.commit()

init_db()

# --- ROUTE AUTHENTICATION (LOGIN & REGISTER) ---

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect('/login')
    return render_template('index.html', username=session.get('username'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        with get_db() as conn:
            user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()

        if user and check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            return redirect('/')
        else:
            return render_template('login.html', error="Username atau password salah!")

    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        hashed_password = generate_password_hash(password)

        try:
            with get_db() as conn:
                conn.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, hashed_password))
                conn.commit()
            return redirect('/login')
        except sqlite3.IntegrityError:
            return render_template('register.html', error="Username sudah terdaftar! Gunakan nama/email lain.")

    return render_template('register.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/login')

# --- API TRANSAKSI (KHUSUS PEMILIK AKUN) ---

@app.route('/api/transaksi', methods=['GET'])
def get_transaksi():
    if 'user_id' not in session:
        return jsonify([]), 401

    user_id = session['user_id']
    bulan = request.args.get('bulan', 'semua')
    tahun = request.args.get('tahun', 'semua')
    jenis = request.args.get('jenis', 'semua')

    query = "SELECT * FROM transaksi WHERE user_id = ?"
    params = [user_id]

    if jenis != 'semua':
        query += " AND jenis = ?"
        params.append(jenis)

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
        result = [dict(row) for row in rows]

    # Filter Bulan & Tahun
    filtered = []
    for t in result:
        tgl = t.get('tanggal', '')
        if tgl and len(tgl) >= 7:
            t_tahun, t_bulan, _ = tgl.split('-')
            match_bulan = (bulan == 'semua' or t_bulan == bulan)
            match_tahun = (tahun == 'semua' or t_tahun == tahun)
            if match_bulan and match_tahun:
                filtered.append(t)

    return jsonify(filtered)

@app.route('/api/transaksi', methods=['POST'])
def tambah_transaksi():
    if 'user_id' not in session:
        return jsonify({"error": "Silakan login terlebih dahulu"}), 401

    data = request.get_json()
    user_id = session['user_id']

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO transaksi (user_id, jenis, kategori, jumlah, keterangan, tanggal) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, data.get('jenis'), data.get('kategori'), int(data.get('jumlah', 0)), data.get('keterangan'), data.get('tanggal'))
        )
        conn.commit()
        new_id = cursor.lastrowid

    return jsonify({"success": True, "id": new_id}), 201

@app.route('/api/transaksi/<int:id>', methods=['DELETE'])
def hapus_transaksi(id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    with get_db() as conn:
        conn.execute("DELETE FROM transaksi WHERE id = ? AND user_id = ?", (id, session['user_id']))
        conn.commit()

    return jsonify({"success": True}), 200

if __name__ == '__main__':
    app.run(debug=True)
