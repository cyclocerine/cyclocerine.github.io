#include <iostream>
#include <string>

using namespace std;

// Mendefinisikan kapasitas maksimal array
const int MAX_SISWA = 100;

// 1. Struct: Pendataan Siswa
struct Siswa {
    int nis;
    string nama;
    string kelas;
    int poinAwal;
    int hariTerlambat;
    int totalPoinPelanggaran;
};

// 2. Rekursi: Menghitung akumulasi poin sanksi
int hitungDendaPoin(int n) {
    if (n <= 0) {
        return 0; // Base case
    }
    return (2 * n) + hitungDendaPoin(n - 1);
}

// Fungsi bantuan untuk mengurutkan array (syarat wajib Binary Search)
void urutkanBerdasarkanNIS(Siswa daftarSiswa[], int jumlahData) {
    for (int i = 0; i < jumlahData - 1; i++) {
        for (int j = 0; j < jumlahData - i - 1; j++) {
            if (daftarSiswa[j].nis > daftarSiswa[j + 1].nis) {
                // Tukar posisi jika NIS tidak berurutan
                Siswa temp = daftarSiswa[j];
                daftarSiswa[j] = daftarSiswa[j + 1];
                daftarSiswa[j + 1] = temp;
            }
        }
    }
}

// 3. Searching: Menggunakan Binary Search pada Array
int pencarianBinarySearch(const Siswa daftarSiswa[], int jumlahData, int nisTarget) {
    int kiri = 0;
    int kanan = jumlahData - 1;

    while (kiri <= kanan) {
        int tengah = kiri + (kanan - kiri) / 2;

        if (daftarSiswa[tengah].nis == nisTarget) {
            return tengah; // Mengembalikan indeks siswa jika ditemukan
        }
        if (daftarSiswa[tengah].nis < nisTarget) {
            kiri = tengah + 1;
        } else {
            kanan = tengah - 1;
        }
    }
    return -1; // Mengembalikan -1 jika tidak ditemukan
}

int main() {
    Siswa daftarSiswa[MAX_SISWA]; // Deklarasi Array of Struct
    int jumlahData = 0;           // Melacak indeks/jumlah data saat ini
    int pilihan;

    do {
        // Menu Utama
        cout << "\n=== Sistem Informasi Akademik Sekolah ===" << endl;
        cout << "1. Tambah Siswa" << endl;
        cout << "2. Lihat Data" << endl;
        cout << "3. Cari Siswa" << endl;
        cout << "4. Exit" << endl;
        cout << "Pilih menu (1-4): ";
        cin >> pilihan;

        switch (pilihan) {
            case 1: {
                int jumlahInput;
                cout << "\nInputkan jumlah siswa yang ingin didata: ";
                cin >> jumlahInput;

                // Cek agar tidak melebihi kapasitas array
                if (jumlahData + jumlahInput > MAX_SISWA) {
                    cout << "Kapasitas tidak mencukupi! Sisa slot: " << (MAX_SISWA - jumlahData) << "\n";
                    break;
                }

                for (int i = 0; i < jumlahInput; i++) {
                    cout << "\n--- Data Siswa ke-" << (jumlahData + 1) << " ---" << endl;
                    cout << "NIS: ";
                    cin >> daftarSiswa[jumlahData].nis;
                    cin.ignore(); 
                    
                    cout << "Nama Siswa: ";
                    getline(cin, daftarSiswa[jumlahData].nama);
                    
                    cout << "Kelas: ";
                    getline(cin, daftarSiswa[jumlahData].kelas);
                    
                    cout << "Poin Awal Pelanggaran: ";
                    cin >> daftarSiswa[jumlahData].poinAwal;
                    
                    cout << "Jumlah hari terlambat berturut-turut: ";
                    cin >> daftarSiswa[jumlahData].hariTerlambat;

                    // Hitung total poin
                    int dendaTerlambat = hitungDendaPoin(daftarSiswa[jumlahData].hariTerlambat);
                    daftarSiswa[jumlahData].totalPoinPelanggaran = daftarSiswa[jumlahData].poinAwal + dendaTerlambat;

                    cout << "-> Data berhasil ditambahkan! Total Poin saat ini: " 
                         << daftarSiswa[jumlahData].totalPoinPelanggaran << "\n";
                         
                    jumlahData++; // Increment jumlah data siswa yang tersimpan
                }
                break;
            }
            case 2: {
                cout << "\n=== Data Seluruh Siswa ===" << endl;
                if (jumlahData == 0) {
                    cout << "Belum ada data siswa." << endl;
                } else {
                    for (int i = 0; i < jumlahData; i++) {
                        cout << "NIS: " << daftarSiswa[i].nis 
                             << " | Nama: " << daftarSiswa[i].nama 
                             << " | Kelas: " << daftarSiswa[i].kelas 
                             << " | Poin Total: " << daftarSiswa[i].totalPoinPelanggaran << endl;
                    }
                }
                break;
            }
            case 3: {
                if (jumlahData == 0) {
                    cout << "\nBelum ada data siswa untuk dicari." << endl;
                    break;
                }

                int nisCari;
                cout << "\nMasukkan NIS yang ingin dicari: ";
                cin >> nisCari;

                // Mengurutkan array terlebih dahulu sebelum Binary Search
                urutkanBerdasarkanNIS(daftarSiswa, jumlahData);

                // Lakukan pencarian
                int indeksDitemukan = pencarianBinarySearch(daftarSiswa, jumlahData, nisCari);

                if (indeksDitemukan != -1) {
                    cout << "\n--- Data Siswa Ditemukan ---" << endl;
                    cout << "NIS             : " << daftarSiswa[indeksDitemukan].nis << endl;
                    cout << "Nama            : " << daftarSiswa[indeksDitemukan].nama << endl;
                    cout << "Kelas           : " << daftarSiswa[indeksDitemukan].kelas << endl;
                    cout << "Poin Awal       : " << daftarSiswa[indeksDitemukan].poinAwal << endl;
                    cout << "Hari Terlambat  : " << daftarSiswa[indeksDitemukan].hariTerlambat << " hari" << endl;
                    cout << "Total Poin Baru : " << daftarSiswa[indeksDitemukan].totalPoinPelanggaran << endl;
                } else {
                    cout << "\nSiswa dengan NIS " << nisCari << " tidak ditemukan." << endl;
                }
                break;
            }
            case 4:
                cout << "\nKeluar dari program. Terima kasih!" << endl;
                break;
            default:
                cout << "\nPilihan tidak valid. Silakan coba lagi." << endl;
        }
    } while (pilihan != 4);

    return 0;
}