package com.anonymous.dualenginemusicapp

import android.content.ContentValues
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLDecoder
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.charset.StandardCharsets

class MediaSaverModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "MediaSaverModule"

    enum class AudioFormat(val extension: String, val mimeType: String) {
        MP3(".mp3", "audio/mpeg"),
        M4A(".m4a", "audio/mp4"),
        FLAC(".flac", "audio/flac"),
        OGG(".ogg", "audio/ogg"),
        WAV(".wav", "audio/wav")
    }

    private fun detectAudioFormat(file: File): AudioFormat {
        try {
            FileInputStream(file).use { input ->
                val header = ByteArray(16)
                val read = input.read(header)
                if (read >= 8) {
                    // M4A / MP4 container: bytes 4-7 are 'f' 't' 'y' 'p'
                    if (header[4] == 'f'.code.toByte() && header[5] == 't'.code.toByte() &&
                        header[6] == 'y'.code.toByte() && header[7] == 'p'.code.toByte()
                    ) {
                        return AudioFormat.M4A
                    }
                    // FLAC container: 'f' 'L' 'a' 'C'
                    if (header[0] == 'f'.code.toByte() && header[1] == 'L'.code.toByte() &&
                        header[2] == 'a'.code.toByte() && header[3] == 'C'.code.toByte()
                    ) {
                        return AudioFormat.FLAC
                    }
                    // OGG container: 'O' 'g' 'g' 'S'
                    if (header[0] == 'O'.code.toByte() && header[1] == 'g'.code.toByte() &&
                        header[2] == 'g'.code.toByte() && header[3] == 'S'.code.toByte()
                    ) {
                        return AudioFormat.OGG
                    }
                    // MP3 ID3 container: 'I' 'D' '3'
                    if (header[0] == 'I'.code.toByte() && header[1] == 'D'.code.toByte() && header[2] == '3'.code.toByte()) {
                        return AudioFormat.MP3
                    }
                    // MP3 raw frame sync: 11 bits set (0xFFE0 mask)
                    val b0 = header[0].toInt() and 0xFF
                    val b1 = header[1].toInt() and 0xFF
                    if (b0 == 0xFF && (b1 and 0xE0) == 0xE0) {
                        return AudioFormat.MP3
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return AudioFormat.MP3
    }

    private fun sanitizeFileName(name: String): String {
        return name
            .replace("[\\\\/:*?\"<>|]".toRegex(), "_")
            .replace("\\s+".toRegex(), " ")
            .trim()
    }

    private fun resolveSourceFile(localPath: String): File? {
        val candidates = mutableListOf<String>()

        val raw = localPath.replace("file://", "")
        candidates.add(raw)

        try {
            candidates.add(URLDecoder.decode(raw, "UTF-8"))
        } catch (ignored: Exception) {}

        try {
            val uri = Uri.parse(localPath)
            uri.path?.let { candidates.add(it) }
            uri.path?.let { candidates.add(URLDecoder.decode(it, "UTF-8")) }
        } catch (ignored: Exception) {}

        for (candidate in candidates) {
            val file = File(candidate)
            if (file.exists() && file.isFile && file.length() > 0) {
                return file
            }
        }

        // Search directory fallback
        for (candidate in candidates) {
            val file = File(candidate)
            val parent = file.parentFile
            if (parent != null && parent.exists() && parent.isDirectory) {
                val found = parent.listFiles()?.firstOrNull { 
                    it.isFile && (it.name == file.name || it.name.contains(file.nameWithoutExtension))
                }
                if (found != null && found.length() > 0) {
                    return found
                }
            }
        }

        return null
    }

    private fun loadArtworkBytes(artworkPath: String?, artworkUrl: String?): ByteArray? {
        // 1. Try local artwork file first
        if (!artworkPath.isNullOrBlank()) {
            val artFile = resolveSourceFile(artworkPath)
            if (artFile != null && artFile.exists() && artFile.isFile && artFile.length() > 0) {
                try {
                    val bytes = artFile.readBytes()
                    if (bytes.isNotEmpty()) return bytes
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        // 2. Try remote artwork URL with redirect following
        if (!artworkUrl.isNullOrBlank() && artworkUrl.startsWith("http")) {
            var currentUrl = artworkUrl
            var redirects = 0
            while (currentUrl != null && redirects < 5) {
                try {
                    val url = URL(currentUrl)
                    val conn = url.openConnection() as HttpURLConnection
                    conn.instanceFollowRedirects = true
                    conn.connectTimeout = 10000
                    conn.readTimeout = 10000
                    conn.requestMethod = "GET"
                    conn.setRequestProperty(
                        "User-Agent",
                        "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36"
                    )
                    conn.connect()
                    val responseCode = conn.responseCode
                    if (responseCode in 300..399) {
                        currentUrl = conn.getHeaderField("Location")
                        redirects++
                        continue
                    }
                    if (responseCode == 200) {
                        conn.inputStream.use { input ->
                            val bytes = input.readBytes()
                            if (bytes.size > 200) {
                                return bytes
                            }
                        }
                    }
                    break
                } catch (e: Exception) {
                    e.printStackTrace()
                    break
                }
            }
        }

        return null
    }

    private data class Mp4Box(val type: String, val offset: Int, val size: Long, val headerSize: Int)

    /**
     * Embeds metadata (title, artist, album) and cover artwork (covr) into an M4A / MP4 container
     * while correctly updating moov/meta/udta atoms and shifting stco/co64 chunk offsets.
     */
    private fun tagM4A(
        inputBytes: ByteArray,
        title: String,
        artist: String,
        album: String,
        imageBytes: ByteArray?
    ): ByteArray {
        try {
            val inputBuffer = ByteBuffer.wrap(inputBytes).order(ByteOrder.BIG_ENDIAN)
            val boxes = mutableListOf<Mp4Box>()
            var pos = 0
            while (pos + 8 <= inputBytes.size) {
                val size32 = inputBuffer.getInt(pos).toLong() and 0xFFFFFFFFL
                val typeBytes = ByteArray(4)
                inputBuffer.position(pos + 4)
                inputBuffer.get(typeBytes)
                val type = String(typeBytes, StandardCharsets.US_ASCII)

                var boxSize = size32
                var headerSize = 8
                if (size32 == 1L) {
                    if (pos + 16 > inputBytes.size) break
                    boxSize = inputBuffer.getLong(pos + 8)
                    headerSize = 16
                } else if (size32 == 0L) {
                    boxSize = (inputBytes.size - pos).toLong()
                }

                if (boxSize < 8 || pos + boxSize > inputBytes.size) break

                boxes.add(Mp4Box(type, pos, boxSize, headerSize))
                pos += boxSize.toInt()
            }

            val moovBox = boxes.firstOrNull { it.type == "moov" } ?: return inputBytes

            // Build ilst metadata atoms
            val ilstStream = ByteArrayOutputStream()

            fun writeDataAtom(tag4: ByteArray, typeCode: Int, data: ByteArray) {
                val dataSize = 16 + data.size
                val atomSize = 8 + dataSize
                val atomBuf = ByteBuffer.allocate(atomSize).order(ByteOrder.BIG_ENDIAN)
                atomBuf.putInt(atomSize)
                atomBuf.put(tag4)
                atomBuf.putInt(dataSize)
                atomBuf.put("data".toByteArray(StandardCharsets.US_ASCII))
                atomBuf.putInt(typeCode)
                atomBuf.putInt(0) // locale / flags = 0
                atomBuf.put(data)
                ilstStream.write(atomBuf.array())
            }

            if (title.isNotBlank()) {
                writeDataAtom(
                    byteArrayOf(0xA9.toByte(), 'n'.code.toByte(), 'a'.code.toByte(), 'm'.code.toByte()),
                    1,
                    title.toByteArray(StandardCharsets.UTF_8)
                )
            }
            if (artist.isNotBlank()) {
                writeDataAtom(
                    byteArrayOf(0xA9.toByte(), 'A'.code.toByte(), 'R'.code.toByte(), 'T'.code.toByte()),
                    1,
                    artist.toByteArray(StandardCharsets.UTF_8)
                )
            }
            if (album.isNotBlank()) {
                writeDataAtom(
                    byteArrayOf(0xA9.toByte(), 'a'.code.toByte(), 'l'.code.toByte(), 'b'.code.toByte()),
                    1,
                    album.toByteArray(StandardCharsets.UTF_8)
                )
            }
            if (imageBytes != null && imageBytes.isNotEmpty()) {
                val isPng = imageBytes.size >= 8 && imageBytes[0] == 0x89.toByte() && imageBytes[1] == 0x50.toByte()
                val typeCode = if (isPng) 14 else 13 // 13 = JPEG, 14 = PNG
                writeDataAtom("covr".toByteArray(StandardCharsets.US_ASCII), typeCode, imageBytes)
            }

            val ilstPayload = ilstStream.toByteArray()
            val ilstSize = 8 + ilstPayload.size
            val ilstBox = ByteBuffer.allocate(ilstSize).order(ByteOrder.BIG_ENDIAN)
            ilstBox.putInt(ilstSize)
            ilstBox.put("ilst".toByteArray(StandardCharsets.US_ASCII))
            ilstBox.put(ilstPayload)

            // Handler box (33 bytes)
            val hdlrBox = ByteBuffer.allocate(33).order(ByteOrder.BIG_ENDIAN)
            hdlrBox.putInt(33)
            hdlrBox.put("hdlr".toByteArray(StandardCharsets.US_ASCII))
            hdlrBox.putInt(0) // version + flags
            hdlrBox.putInt(0) // predefined
            hdlrBox.put("mdir".toByteArray(StandardCharsets.US_ASCII))
            hdlrBox.put("appl".toByteArray(StandardCharsets.US_ASCII))

            // meta box (flags + hdlr + ilst)
            val metaPayloadSize = 4 + 33 + ilstSize
            val metaSize = 8 + metaPayloadSize
            val metaBox = ByteBuffer.allocate(metaSize).order(ByteOrder.BIG_ENDIAN)
            metaBox.putInt(metaSize)
            metaBox.put("meta".toByteArray(StandardCharsets.US_ASCII))
            metaBox.putInt(0) // meta version & flags = 0
            metaBox.put(hdlrBox.array())
            metaBox.put(ilstBox.array())

            // udta box
            val udtaSize = 8 + metaSize
            val udtaBox = ByteBuffer.allocate(udtaSize).order(ByteOrder.BIG_ENDIAN)
            udtaBox.putInt(udtaSize)
            udtaBox.put("udta".toByteArray(StandardCharsets.US_ASCII))
            udtaBox.put(metaBox.array())

            // Reconstruct moov box (excluding old udta)
            val moovBytes = ByteArray(moovBox.size.toInt())
            System.arraycopy(inputBytes, moovBox.offset, moovBytes, 0, moovBox.size.toInt())
            val moovBuffer = ByteBuffer.wrap(moovBytes).order(ByteOrder.BIG_ENDIAN)

            val moovChildren = mutableListOf<ByteArray>()
            var moovPos = moovBox.headerSize
            while (moovPos + 8 <= moovBytes.size) {
                val childSize = moovBuffer.getInt(moovPos)
                if (childSize <= 0 || moovPos + childSize > moovBytes.size) break
                val childTypeBytes = ByteArray(4)
                moovBuffer.position(moovPos + 4)
                moovBuffer.get(childTypeBytes)
                val childType = String(childTypeBytes, StandardCharsets.US_ASCII)

                if (childType != "udta") {
                    val childBytes = ByteArray(childSize)
                    System.arraycopy(moovBytes, moovPos, childBytes, 0, childSize)
                    moovChildren.add(childBytes)
                }
                moovPos += childSize
            }
            moovChildren.add(udtaBox.array())

            var moovPayloadSize = 0
            for (child in moovChildren) moovPayloadSize += child.size

            val newMoovSize = 8 + moovPayloadSize
            val newMoovBox = ByteBuffer.allocate(newMoovSize).order(ByteOrder.BIG_ENDIAN)
            newMoovBox.putInt(newMoovSize)
            newMoovBox.put("moov".toByteArray(StandardCharsets.US_ASCII))
            for (child in moovChildren) {
                newMoovBox.put(child)
            }

            val newMoovBytes = newMoovBox.array()
            val delta = newMoovSize - moovBox.size.toInt()

            // Adjust stco / co64 chunk offsets in newMoovBytes if moov precedes mdat
            val mdatBox = boxes.firstOrNull { it.type == "mdat" }
            if (mdatBox != null && moovBox.offset < mdatBox.offset && delta != 0) {
                val newMoovBuffer = ByteBuffer.wrap(newMoovBytes).order(ByteOrder.BIG_ENDIAN)
                var searchPos = 0
                while (searchPos + 8 <= newMoovBytes.size) {
                    val tagBytes = ByteArray(4)
                    newMoovBuffer.position(searchPos + 4)
                    newMoovBuffer.get(tagBytes)
                    val tag = String(tagBytes, StandardCharsets.US_ASCII)

                    if (tag == "stco") {
                        val stcoSize = newMoovBuffer.getInt(searchPos)
                        val entryCount = newMoovBuffer.getInt(searchPos + 12)
                        for (i in 0 until entryCount) {
                            val offPos = searchPos + 16 + i * 4
                            val oldOff = newMoovBuffer.getInt(offPos)
                            newMoovBuffer.putInt(offPos, oldOff + delta)
                        }
                        searchPos += if (stcoSize > 0) stcoSize else 4
                    } else if (tag == "co64") {
                        val co64Size = newMoovBuffer.getInt(searchPos)
                        val entryCount = newMoovBuffer.getInt(searchPos + 12)
                        for (i in 0 until entryCount) {
                            val offPos = searchPos + 16 + i * 8
                            val oldOff = newMoovBuffer.getLong(offPos)
                            newMoovBuffer.putLong(offPos, oldOff + delta.toLong())
                        }
                        searchPos += if (co64Size > 0) co64Size else 4
                    } else {
                        searchPos++
                    }
                }
            }

            val outStream = ByteArrayOutputStream(inputBytes.size + delta + 1024)
            for (box in boxes) {
                if (box.type == "moov") {
                    outStream.write(newMoovBytes)
                } else {
                    outStream.write(inputBytes, box.offset, box.size.toInt())
                }
            }

            return outStream.toByteArray()
        } catch (e: Exception) {
            e.printStackTrace()
            return inputBytes
        }
    }

    /**
     * Embeds metadata (title, artist, album) and cover artwork (APIC) into an ID3v2.3 MP3 header.
     */
    private fun tagMP3(
        inputBytes: ByteArray,
        title: String,
        artist: String,
        album: String,
        imageBytes: ByteArray?
    ): ByteArray {
        try {
            var audioStart = 0
            if (inputBytes.size >= 10 &&
                inputBytes[0] == 'I'.code.toByte() &&
                inputBytes[1] == 'D'.code.toByte() &&
                inputBytes[2] == '3'.code.toByte()
            ) {
                val s0 = inputBytes[6].toInt() and 0x7F
                val s1 = inputBytes[7].toInt() and 0x7F
                val s2 = inputBytes[8].toInt() and 0x7F
                val s3 = inputBytes[9].toInt() and 0x7F
                val tagSize = (s0 shl 21) or (s1 shl 14) or (s2 shl 7) or s3
                audioStart = 10 + tagSize
                if (audioStart > inputBytes.size) audioStart = 0
            }

            val framesStream = ByteArrayOutputStream()

            fun writeTextFrame(frameId: String, text: String) {
                if (text.isBlank()) return
                val textBytes = text.toByteArray(StandardCharsets.UTF_8)
                val payloadSize = 1 + textBytes.size
                val frameBuf = ByteBuffer.allocate(10 + payloadSize).order(ByteOrder.BIG_ENDIAN)
                frameBuf.put(frameId.toByteArray(StandardCharsets.US_ASCII))
                frameBuf.putInt(payloadSize)
                frameBuf.putShort(0) // flags
                frameBuf.put(0x03.toByte()) // 0x03 = UTF-8 encoding
                frameBuf.put(textBytes)
                framesStream.write(frameBuf.array())
            }

            writeTextFrame("TIT2", title)
            writeTextFrame("TPE1", artist)
            writeTextFrame("TALB", album)

            if (imageBytes != null && imageBytes.isNotEmpty()) {
                val isPng = imageBytes.size >= 8 && imageBytes[0] == 0x89.toByte() && imageBytes[1] == 0x50.toByte()
                val mime = if (isPng) "image/png" else "image/jpeg"
                val mimeBytes = mime.toByteArray(StandardCharsets.US_ASCII)

                val payloadSize = 1 + mimeBytes.size + 1 + 1 + 1 + imageBytes.size
                val frameBuf = ByteBuffer.allocate(10 + payloadSize).order(ByteOrder.BIG_ENDIAN)
                frameBuf.put("APIC".toByteArray(StandardCharsets.US_ASCII))
                frameBuf.putInt(payloadSize)
                frameBuf.putShort(0) // flags
                frameBuf.put(0x00.toByte()) // ISO-8859-1 for mime
                frameBuf.put(mimeBytes)
                frameBuf.put(0x00.toByte()) // null term
                frameBuf.put(0x03.toByte()) // Front Cover
                frameBuf.put(0x00.toByte()) // Empty description null term
                frameBuf.put(imageBytes)
                framesStream.write(frameBuf.array())
            }

            val allFrames = framesStream.toByteArray()
            val tagSize = allFrames.size

            val headerBuf = ByteBuffer.allocate(10).order(ByteOrder.BIG_ENDIAN)
            headerBuf.put("ID3".toByteArray(StandardCharsets.US_ASCII))
            headerBuf.put(0x03.toByte()) // version 2.3
            headerBuf.put(0x00.toByte()) // revision 0
            headerBuf.put(0x00.toByte()) // flags
            headerBuf.put(((tagSize shr 21) and 0x7F).toByte())
            headerBuf.put(((tagSize shr 14) and 0x7F).toByte())
            headerBuf.put(((tagSize shr 7) and 0x7F).toByte())
            headerBuf.put((tagSize and 0x7F).toByte())

            val rawAudioLen = inputBytes.size - audioStart
            val outStream = ByteArrayOutputStream(10 + tagSize + rawAudioLen)
            outStream.write(headerBuf.array())
            outStream.write(allFrames)
            outStream.write(inputBytes, audioStart, rawAudioLen)

            return outStream.toByteArray()
        } catch (e: Exception) {
            e.printStackTrace()
            return inputBytes
        }
    }

    @ReactMethod
    fun saveAudioToPublicStorage(
        localPath: String,
        title: String,
        artist: String,
        album: String,
        artworkPath: String?,
        artworkUrl: String?,
        promise: Promise
    ) {
        try {
            val sourceFile = resolveSourceFile(localPath)
            if (sourceFile == null) {
                promise.reject(
                    "FILE_NOT_FOUND",
                    "Source audio file does not exist at: $localPath"
                )
                return
            }

            val format = detectAudioFormat(sourceFile)
            val safeTitle = sanitizeFileName(title.ifEmpty { "Track" })
            val safeArtist = sanitizeFileName(artist.ifEmpty { "Unknown Artist" })
            val fileName = "$safeTitle - $safeArtist${format.extension}"
            val targetAlbum = if (album.isNotBlank()) album else "DualEngine Music"

            val imageBytes = loadArtworkBytes(artworkPath, artworkUrl)

            // Read source file bytes and embed metadata & album artwork
            val rawBytes = sourceFile.readBytes()
            val finalAudioBytes = when (format) {
                AudioFormat.M4A -> tagM4A(rawBytes, safeTitle, safeArtist, targetAlbum, imageBytes)
                AudioFormat.MP3 -> tagMP3(rawBytes, safeTitle, safeArtist, targetAlbum, imageBytes)
                else -> rawBytes
            }

            var savedAudioContentUri: String? = null
            var savedPublicMusicPath: String = ""

            val resolver = reactContext.contentResolver

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // 1. Save audio to MediaStore.Audio.Media (Android 10+)
                val audioValues = ContentValues().apply {
                    put(MediaStore.Audio.Media.DISPLAY_NAME, fileName)
                    put(MediaStore.Audio.Media.TITLE, safeTitle)
                    put(MediaStore.Audio.Media.ARTIST, safeArtist)
                    put(MediaStore.Audio.Media.ALBUM, targetAlbum)
                    put(MediaStore.Audio.Media.MIME_TYPE, format.mimeType)
                    put(
                        MediaStore.Audio.Media.RELATIVE_PATH,
                        "${Environment.DIRECTORY_MUSIC}/$targetAlbum"
                    )
                    put(MediaStore.Audio.Media.IS_PENDING, 1)
                    put(MediaStore.Audio.Media.IS_MUSIC, 1)
                    put(MediaStore.Audio.Media.DATE_ADDED, System.currentTimeMillis() / 1000)
                    put(MediaStore.Audio.Media.DATE_MODIFIED, System.currentTimeMillis() / 1000)
                }

                val audioCollection = MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                val audioUri = resolver.insert(audioCollection, audioValues)
                    ?: throw Exception("Failed to create MediaStore entry for audio")

                // Write the tagged audio stream containing embedded cover art
                resolver.openOutputStream(audioUri)?.use { output ->
                    output.write(finalAudioBytes)
                } ?: throw Exception("Failed to open MediaStore output stream")

                audioValues.clear()
                audioValues.put(MediaStore.Audio.Media.IS_PENDING, 0)
                resolver.update(audioUri, audioValues, null, null)

                savedAudioContentUri = audioUri.toString()
                savedPublicMusicPath = "/sdcard/${Environment.DIRECTORY_MUSIC}/$targetAlbum/$fileName"

                // 2. Also save album cover artwork as cover.jpg in the album folder
                if (imageBytes != null && imageBytes.isNotEmpty()) {
                    try {
                        val imgValues = ContentValues().apply {
                            put(MediaStore.Images.Media.DISPLAY_NAME, "cover.jpg")
                            put(MediaStore.Images.Media.TITLE, "$targetAlbum Cover")
                            put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
                            put(
                                MediaStore.Images.Media.RELATIVE_PATH,
                                "${Environment.DIRECTORY_MUSIC}/$targetAlbum"
                            )
                            put(MediaStore.Images.Media.IS_PENDING, 1)
                        }

                        val imgCollection = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                        val imgUri = resolver.insert(imgCollection, imgValues)
                        if (imgUri != null) {
                            resolver.openOutputStream(imgUri)?.use { out ->
                                out.write(imageBytes)
                            }
                            imgValues.clear()
                            imgValues.put(MediaStore.Images.Media.IS_PENDING, 0)
                            resolver.update(imgUri, imgValues, null, null)

                            val coverPath = "/sdcard/${Environment.DIRECTORY_MUSIC}/$targetAlbum/cover.jpg"
                            MediaScannerConnection.scanFile(
                                reactContext,
                                arrayOf(coverPath),
                                arrayOf("image/jpeg"),
                                null
                            )
                        }
                    } catch (artSaveErr: Exception) {
                        artSaveErr.printStackTrace()
                    }
                }

                // 3. Scan the audio file for instant system indexing
                MediaScannerConnection.scanFile(
                    reactContext,
                    arrayOf(savedPublicMusicPath),
                    arrayOf(format.mimeType),
                    null
                )
            } else {
                // Android 9 and lower - direct file copy
                val publicMusicDir = File(
                    Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MUSIC),
                    targetAlbum
                )
                if (!publicMusicDir.exists()) publicMusicDir.mkdirs()
                val destFile = File(publicMusicDir, fileName)

                destFile.writeBytes(finalAudioBytes)
                savedPublicMusicPath = destFile.absolutePath

                if (imageBytes != null && imageBytes.isNotEmpty()) {
                    try {
                        val coverFile = File(publicMusicDir, "cover.jpg")
                        coverFile.writeBytes(imageBytes)
                        MediaScannerConnection.scanFile(
                            reactContext,
                            arrayOf(coverFile.absolutePath),
                            arrayOf("image/jpeg"),
                            null
                        )
                    } catch (ignored: Exception) {}
                }

                MediaScannerConnection.scanFile(
                    reactContext,
                    arrayOf(destFile.absolutePath),
                    arrayOf(format.mimeType)
                ) { _, uri -> savedAudioContentUri = uri?.toString() }
            }

            val result: WritableMap = Arguments.createMap().apply {
                putBoolean("success", true)
                putString("contentUri", savedAudioContentUri ?: "")
                putString("publicPath", savedPublicMusicPath)
                putString("fileName", fileName)
                putString("album", targetAlbum)
                putString("mimeType", format.mimeType)
                putBoolean("hasArtwork", imageBytes != null && imageBytes.isNotEmpty())
            }

            promise.resolve(result)
        } catch (e: Exception) {
            e.printStackTrace()
            promise.reject("SAVE_FAILED", e.message ?: "Failed to save audio to media store", e)
        }
    }

    @ReactMethod
    fun trimAndSaveAudioToPublicStorage(
        localPath: String,
        startMs: Double,
        endMs: Double,
        title: String,
        artist: String,
        album: String,
        artworkLocalUri: String?,
        artworkRemoteUrl: String?,
        promise: Promise
    ) {
        try {
            val sourceFile = resolveSourceFile(localPath)
            if (sourceFile == null || !sourceFile.exists()) {
                promise.reject("FILE_NOT_FOUND", "Source audio file does not exist at: $localPath")
                return
            }

            val format = detectAudioFormat(sourceFile)
            val tempTrimmedFile = File(reactContext.cacheDir, "trimmed_${System.currentTimeMillis()}${format.extension}")

            var trimSuccess = false

            // Try MediaExtractor + MediaMuxer for standard audio extraction
            try {
                val extractor = MediaExtractor()
                extractor.setDataSource(sourceFile.absolutePath)
                var audioTrackIndex = -1
                var audioFormat: MediaFormat? = null
                for (i in 0 until extractor.trackCount) {
                    val trackFormat = extractor.getTrackFormat(i)
                    val mime = trackFormat.getString(MediaFormat.KEY_MIME) ?: ""
                    if (mime.startsWith("audio/")) {
                        audioTrackIndex = i
                        audioFormat = trackFormat
                        break
                    }
                }

                if (audioTrackIndex >= 0 && audioFormat != null) {
                    extractor.selectTrack(audioTrackIndex)
                    val muxerOutputFormat = if (format == AudioFormat.M4A) {
                        MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4
                    } else {
                        MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4
                    }
                    val muxer = MediaMuxer(tempTrimmedFile.absolutePath, muxerOutputFormat)
                    val muxerTrackIndex = muxer.addTrack(audioFormat)
                    muxer.start()

                    val startUs = (startMs * 1000).toLong()
                    val endUs = (endMs * 1000).toLong()
                    extractor.seekTo(startUs, MediaExtractor.SEEK_TO_PREVIOUS_SYNC)

                    val maxBufferSize = if (audioFormat.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
                        audioFormat.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE)
                    } else 256 * 1024
                    val buffer = ByteBuffer.allocate(Math.max(maxBufferSize, 64 * 1024))
                    val bufferInfo = MediaCodec.BufferInfo()

                    while (true) {
                        bufferInfo.offset = 0
                        bufferInfo.size = extractor.readSampleData(buffer, 0)
                        if (bufferInfo.size < 0) break

                        val sampleTimeUs = extractor.sampleTime
                        if (sampleTimeUs > endUs) break

                        bufferInfo.presentationTimeUs = Math.max(0L, sampleTimeUs - startUs)
                        bufferInfo.flags = extractor.sampleFlags
                        muxer.writeSampleData(muxerTrackIndex, buffer, bufferInfo)
                        extractor.advance()
                    }

                    muxer.stop()
                    muxer.release()
                    extractor.release()
                    if (tempTrimmedFile.exists() && tempTrimmedFile.length() > 500) {
                        trimSuccess = true
                    }
                }
            } catch (muxerErr: Exception) {
                muxerErr.printStackTrace()
            }

            // Fallback for MP3 / raw stream byte slices
            if (!trimSuccess) {
                val fileBytes = sourceFile.readBytes()
                val approxTotalMs = Math.max(1000.0, endMs * 1.2)
                val startRatio = Math.max(0.0, Math.min(1.0, startMs / approxTotalMs))
                val endRatio = Math.max(startRatio, Math.min(1.0, endMs / approxTotalMs))
                val startByte = (fileBytes.size * startRatio).toInt()
                val endByte = Math.min(fileBytes.size, (fileBytes.size * endRatio).toInt())
                val slicedBytes = fileBytes.copyOfRange(startByte, Math.max(startByte + 1024, endByte))
                tempTrimmedFile.writeBytes(slicedBytes)
            }

            // Save trimmed file into phone public MediaStore
            val snippetTitle = "$title (Snippet)"
            saveAudioToPublicStorage(
                tempTrimmedFile.absolutePath,
                snippetTitle,
                artist,
                album,
                artworkLocalUri,
                artworkRemoteUrl,
                promise
            )
            tempTrimmedFile.delete()
        } catch (e: Exception) {
            e.printStackTrace()
            promise.reject("TRIM_FAILED", e.message ?: "Failed to trim audio", e)
        }
    }

    @ReactMethod
    fun scanMediaFile(filePath: String, promise: Promise) {
        try {
            val sourceFile = resolveSourceFile(filePath)
            val path = sourceFile?.absolutePath ?: filePath.replace("file://", "")
            val format = if (sourceFile != null) detectAudioFormat(sourceFile) else AudioFormat.MP3
            MediaScannerConnection.scanFile(
                reactContext,
                arrayOf(path),
                arrayOf(format.mimeType)
            ) { scannedPath, uri ->
                val result = Arguments.createMap().apply {
                    putString("path", scannedPath)
                    putString("uri", uri?.toString() ?: "")
                }
                promise.resolve(result)
            }
        } catch (e: Exception) {
            promise.reject("SCAN_FAILED", e.message ?: "Failed to scan file", e)
        }
    }

    @ReactMethod
    fun extractAudioWaveform(localPath: String, numSamples: Int, promise: Promise) {
        Thread {
            try {
                val sourceFile = resolveSourceFile(localPath)
                if (sourceFile == null || !sourceFile.exists()) {
                    promise.reject("FILE_NOT_FOUND", "Source audio file does not exist at: $localPath")
                    return@Thread
                }

                val count = if (numSamples in 32..2048) numSamples else 256
                val peaks = FloatArray(count)

                val extractor = MediaExtractor()
                extractor.setDataSource(sourceFile.absolutePath)
                var audioTrack = -1
                var format: MediaFormat? = null

                for (i in 0 until extractor.trackCount) {
                    val trackFormat = extractor.getTrackFormat(i)
                    val mime = trackFormat.getString(MediaFormat.KEY_MIME) ?: ""
                    if (mime.startsWith("audio/")) {
                        audioTrack = i
                        format = trackFormat
                        break
                    }
                }

                if (audioTrack >= 0 && format != null) {
                    extractor.selectTrack(audioTrack)
                    val mime = format.getString(MediaFormat.KEY_MIME) ?: ""
                    val codec = MediaCodec.createDecoderByType(mime)
                    codec.configure(format, null, null, 0)
                    codec.start()

                    val bufferInfo = MediaCodec.BufferInfo()
                    var isEOS = false
                    val sampleAccumulator = ArrayList<Float>()

                    while (!isEOS) {
                        val inIndex = codec.dequeueInputBuffer(5000)
                        if (inIndex >= 0) {
                            val buffer = codec.getInputBuffer(inIndex)
                            if (buffer != null) {
                                val sampleSize = extractor.readSampleData(buffer, 0)
                                if (sampleSize < 0) {
                                    codec.queueInputBuffer(inIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                                    isEOS = true
                                } else {
                                    codec.queueInputBuffer(inIndex, 0, sampleSize, extractor.sampleTime, 0)
                                    extractor.advance()
                                }
                            }
                        }

                        var outIndex = codec.dequeueOutputBuffer(bufferInfo, 5000)
                        while (outIndex >= 0) {
                            val outBuffer = codec.getOutputBuffer(outIndex)
                            if (outBuffer != null && bufferInfo.size > 0) {
                                outBuffer.position(bufferInfo.offset)
                                outBuffer.limit(bufferInfo.offset + bufferInfo.size)
                                val shortBuffer = outBuffer.asShortBuffer()
                                while (shortBuffer.hasRemaining()) {
                                    val sample = Math.abs(shortBuffer.get().toInt()) / 32768.0f
                                    sampleAccumulator.add(sample)
                                }
                            }
                            codec.releaseOutputBuffer(outIndex, false)
                            if ((bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                                isEOS = true
                                break
                            }
                            outIndex = codec.dequeueOutputBuffer(bufferInfo, 0)
                        }
                    }

                    codec.stop()
                    codec.release()
                    extractor.release()

                    if (sampleAccumulator.isNotEmpty()) {
                        val bucketSize = Math.max(1, sampleAccumulator.size / count)
                        for (b in 0 until count) {
                            val startIdx = b * bucketSize
                            val endIdx = Math.min(sampleAccumulator.size, (b + 1) * bucketSize)
                            var maxVal = 0.08f
                            for (s in startIdx until endIdx) {
                                if (sampleAccumulator[s] > maxVal) {
                                    maxVal = sampleAccumulator[s]
                                }
                            }
                            peaks[b] = Math.min(1.0f, maxVal)
                        }
                    }
                }

                val array = Arguments.createArray()
                for (p in peaks) {
                    array.pushDouble(p.toDouble())
                }

                val result = Arguments.createMap().apply {
                    putBoolean("success", true)
                    putArray("peaks", array)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                e.printStackTrace()
                promise.reject("EXTRACT_FAILED", e.message ?: "Failed to extract waveform", e)
            }
        }.start()
    }
}
